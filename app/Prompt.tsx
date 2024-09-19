"use client";
import { useRef, useState } from "react";
import { useActiveAccount, useActiveWalletChain } from "thirdweb/react";
import { ChatDataParams } from "./Confirm";
import { config } from "./config";

export default function Prompt({
	data,
	setData,
}: {
	data: ChatDataParams[];
	setData: (d: ChatDataParams[]) => void;
}) {
	const [input, setInput] = useState("");
	const [chatLoading, setChatLoading] = useState(false);

	const handleInputChange = (
		event:
			| React.ChangeEvent<HTMLTextAreaElement>
			| React.ChangeEvent<HTMLInputElement>
	) => {
		const value = event.target.value;
		setInput(value);

		// Adjust the height dynamically but cap at 500px
	};

	const handleKeyPress = (event) => {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			handleSubmit();
		}
	};
	const [messages, setMessages] = useState([]);

	const websocket = useRef<WebSocket | null>(null);
	const activeChain = useActiveWalletChain();
	const activeWallet = useActiveAccount();

	async function sendChatHandler() {
		if (!chatLoading) {
			setChatLoading(true);

			// 1. add user message to messages
			const messagesWithUser = [
				...messages,
				...[{ role: "user", content: input }],
			];
			// 1a. if render, show the user message on the chat

			websocket.current = new WebSocket(config.LLM_URL || "");

			websocket.current.onopen = () => {
				// Send a JSON message with parameters
				const message = JSON.stringify({
					message_type: "user",
					user_id: activeWallet?.address,
					messages: messagesWithUser,
					active_chain: activeChain?.name,
				});
				if (!websocket.current) throw new Error("Websocket did not connect");
				websocket.current.send(message);
			};

			websocket.current.onmessage = async (event) => {
				const response = JSON.parse(event.data);
				if (response.msg && response?.msg?.length > 0) {
					const newMsg = {
						content: response.msg,
						data: response.data,
					};
					setData(response.data);
					// @ts-expect-error todo
					setMessages(() => {
						return [
							...messagesWithUser,
							newMsg, // Replace the last item with aiMsg
						];
					});
				}
			};

			websocket.current.onclose = async () => {
				setChatLoading(false);
			};
		}
	}

	const handleSubmit = () => {
		if (input.trim() !== "") {
			sendChatHandler();
			setInput("");
		}
	};
	return (
		<div>
			<input
				value={input}
				onChange={handleInputChange}
				onKeyDown={handleKeyPress}
				placeholder='What can I do for you?'
				className={`min-h-16 z-20 p-4 h-auto w-full rounded-chat bg-chat shadow-input focus-input pr-16 ${
					chatLoading ? "bg-gray-200" : "bg-white"
				} resize-none overflow-y-auto`}
				disabled={chatLoading}
				autoFocus
			/>
			{chatLoading && <p>DATA IS LOADING</p>}
			<button onClick={handleSubmit}>Send Prompt</button>
		</div>
	);
}
