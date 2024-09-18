"use client";

import { ThirdwebProvider } from "thirdweb/react";
import LoginButton from "./LoginButton";
import { ChatDataParams, ConfirmButton } from "./Confirm";
import { useState } from "react";
import Prompt from "./Prompt";

export default function Home() {
	// @ts-expect-error todo
	const [data, setData] = useState<ChatDataParams>([]);
	return (
		<div>
			<ThirdwebProvider>
				<LoginButton />
				{/* @ts-expect-error todo */}
				<Prompt data={data} setData={setData} />
				{data?.transactions_data && (
					// @ts-expect-error todo
					<ConfirmButton data={data?.transactions_data} />
				)}
			</ThirdwebProvider>
		</div>
	);
}
