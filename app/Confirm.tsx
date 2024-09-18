import {
	createThirdwebClient,
	getContract,
	prepareTransaction,
	sendBatchTransaction,
	waitForReceipt,
} from "thirdweb";

import {
	useActiveAccount,
	useActiveWalletChain,
	useActiveWalletConnectionStatus,
	useSwitchActiveWalletChain,
} from "thirdweb/react";

import { approve, transferFrom } from "thirdweb/extensions/erc20";
import prepareUniswapV3PoolTransaction from "./prepareUniswapV3";
import { config } from "./config";

export type ApprovalTransaction = {
	type: "approval";
	data: {
		spender: string;
		amount: number;
		token_address: string;
		chain: { id: number; rpc: string };
	};
};

export type CallDataTransaction = {
	type: "calldata";
	data: {
		calldata: CallData;
		chain: { id: number; rpc: string };
	};
};

export type TransferFromTransaction = {
	type: "transferFrom";
	data: {
		from: string;
		to: string;
		amount: number;
		token_address: string;
		chain: { id: number; rpc: string };
	};
};

export type PoolTransaction = {
	type: "custom.uniswap_pool";
	data: {
		chain: { id: number; rpc: string };
		fee_amount: string;
		amount_a: string;
		amount_b: string;
		pool_address: string;
		npm_address: string;
		decimals_a: number;
		decimals_b: number;
		token_address_a: string;
		token_address_b: string;
		from_address: string;
	};
};

export type BatchTransaction =
	| ApprovalTransaction
	| CallDataTransaction
	| TransferFromTransaction
	| PoolTransaction;

export type ChatDataParams = {
	id: string;
	chain_id: number;
	ui_data: UIData;
	hypha_data: {
		tool: "hypha_choose_tool";
		hypha: number;
	};
	transactions_data: BatchTransaction[];
};

export type CallData = {
	data: string;
	to: string;
	value: string;
	gasPrice: string;
	gasLimit: string;
	from: string;
	chainId: string;
};

export type LiFiUI = {
	tool_name: string;
	tool_image: string;
	transaction: CallData;
	order: string;
	gas_fee: string;
	token_in: {
		symbol: string;
		amount: number;
		chain: string;
	};
	token_out: {
		symbol: string;
		amount: number;
		chain: string;
	};
};

export type TransferUIData = {
	component_id: "fungi.tokenTransfer";
	data: {
		title: string;
		to: string;
		chain: string;
		amount: number;
		token_symbol: string;
		chain_obj: {
			rpc: string;
			id: number;
		};
	};
};

export type PoolUIData = {
	component_id: "fungi.liquidityPool";
	data: {
		title: string;
		chain: string;
		token_a_symbol: string;
		token_b_symbol: string;
		amount_a: number;
		amount_b: number;
		chain_obj: {
			rpc: string;
			id: number;
		};
	};
};

export type LiFiUIData = {
	component_id: "fungi.lifiQuote";
	data: {
		title: string;
		selected: LiFiUI;
		unselected: LiFiUI[];
		chain_obj: {
			rpc: string;
			id: number;
		};
	};
};

export type UIData = TransferUIData | PoolUIData | LiFiUIData;

export type BoxStates = {
	loading: boolean;
	setLoading: (boolean: boolean) => void;
	loadingMsg: string | null;
	setLoadingMsg: (string: string | null) => void;
	errored: boolean;
	setErrored: (boolean: boolean) => void;
	confirmed: boolean;
	setConfirmed: (boolean: boolean) => void;
	added: boolean;
	setAdded: (boolean: boolean) => void;
};

const client = createThirdwebClient({
	clientId: config.THIRDWEB_CLIENT_ID as string,
});

export function ConfirmButton({
	data,
}: {
	data: ChatDataParams;
	//     states: BoxStates;
}) {
	const switchChain = useSwitchActiveWalletChain();
	const chain = useActiveWalletChain();
	const status = useActiveWalletConnectionStatus();
	const smartAccount = useActiveAccount();

	async function ensureSwitch(toChain: { rpc: string; id: number }) {
		if (!smartAccount?.address) throw new Error("Not connected");
		console.log("SWITCHING CHAIN TO: ", toChain.id);
		const timeout = 5000;
		const interval = 100;
		let elapsed = 0;
		const chainObj = {
			rpc: `${toChain.rpc}/${config.THIRDWEB_CLIENT_ID}`,
			id: toChain.id,
		};

		await switchChain(chainObj);

		while (chain?.id !== toChain.id && elapsed < timeout) {
			await new Promise((resolve) => setTimeout(resolve, interval));
			console.log("Chain status: ", status);
			elapsed += interval;
		}

		if (chain?.id === toChain.id) {
			console.log("SWITCHED CHAIN TO: ", chain?.id);
			// Proceed with the rest of your code here
			return;
		} else {
			console.error(
				"Failed to switch chain within the timeout period. Chain is still: ",
				chain?.id
			);
		}
	}

	function buildBatchTransaction(transaction_data: BatchTransaction[]) {
		console.log("BUILDING BATCH TRANSACTION");

		const batch: unknown[] = [];

		transaction_data.forEach(async (transaction) => {
			const { data, type } = transaction;
			await ensureSwitch(data.chain);

			switch (type) {
				case "approval": {
					console.log("PROCESSING APPROVAL...");

					const contract = getContract({
						client,
						address: data.token_address,
						chain: data.chain,
					});
					const approval = approve({
						contract,
						spender: data.spender,
						amount: data.amount,
					});

					batch.push(approval);
					break;
				}
				case "transferFrom": {
					console.log("PROCESSING TRANSFER_FROM...");

					const contract = getContract({
						client,
						address: data.token_address,
						chain: data.chain,
					});
					const t = transferFrom({
						contract,
						from: data.from,
						to: data.to,
						amount: data.amount,
					});
					batch.push(t);
					break;
				}
				case "calldata": {
					console.log("PROCESSING CALLDATA...");
					const { chain, calldata } = data;
					// @ts-expect-error todo
					const t = prepareTransaction({
						...calldata,
						client,
						chain,
					});

					batch.push(t);
					break;
				}
				case "custom.uniswap_pool": {
					console.log("PROCESSING POOL...");

					const t = await prepareUniswapV3PoolTransaction(
						transaction as PoolTransaction
					);
					batch.push(t);
					break;
				}
			}
		});
		return batch;
	}
	const clickHandler = async () => {
		//         states.setLoading(true);
		if (!smartAccount?.address) {
			alert("please connect");
			return;
		}
		try {
			const arrData = Array.isArray(data) ? data : [data];
			//             states.setLoadingMsg("Building transaction");
			const megaBatch: object = {};
			arrData.forEach(async (data) => {
				console.log({ data });
				const { transaction_data, chain_id } = data;
				const b = buildBatchTransaction(transaction_data);
				// @ts-expect-error todo
				if (megaBatch[chain_id]) {
					// @ts-expect-error todo
					megaBatch[chain_id] = [...megaBatch[chain_id], ...b];
				} else {
					// @ts-expect-error todo
					megaBatch[chain_id] = b;
				}
			});

			for (const id in megaBatch) {
				const chain = {
					id: parseInt(id),
					rpc: `https://${id}.rpc.thirdweb.com`,
				};
				//                 states.setLoadingMsg(`Switching to chain: ${chain.id}`);
				await ensureSwitch(chain);

				//                 states.setLoadingMsg(`Sending transaction`);
				const r = await sendBatchTransaction({
					// @ts-expect-error todo
					transactions: megaBatch[id],
					account: smartAccount,
				});
				if (r) {
					//                     states.setLoadingMsg(`Waiting for receipt`);
					const x = await waitForReceipt({
						chain,
						client,
						transactionHash: r.transactionHash,
					});
					if (x) {
						console.log("TRANSACTION SUCCESS");
						//                         states.setConfirmed(true);
					}
				}
			}
		} catch (e: unknown) {
			console.log({ e });
			// @ts-expect-error todo
			throw new Error(e);
			//             states.setErrored(true);
		}
		//         states.setLoading(false);
	};

	return (
		<div>
			<button
				onClick={() => {
					clickHandler();
				}}
				className={`px-4 py-2 rounded-full shadow-lg bg-confirm text-white hover:opacity-70 w-[88px] }`}
			>
				Confirm
			</button>
		</div>
	);
}
