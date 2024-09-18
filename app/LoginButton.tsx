import React from "react";
import { ConnectButton, lightTheme } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { createWallet, walletConnect, inAppWallet } from "thirdweb/wallets";
import { config } from "./config";

const client = createThirdwebClient({
	clientId: config.THIRDWEB_CLIENT_ID as string,
});

const wallets = [
	createWallet("io.metamask"),
	createWallet("com.coinbase.wallet"),
	walletConnect(),
	inAppWallet({
		auth: {
			options: ["email", "google", "apple", "facebook", "phone"],
		},
	}),
];

function getRPC(id: number) {
	return `https://${id}.rpc.thirdweb.com/${config.THIRDWEB_CLIENT_ID}`;
}

export default function LoginButton() {
	return (
		<div>
			<ConnectButton
				client={client}
				wallets={wallets}
				accountAbstraction={{
					chain: {
						id: 8453,
						rpc: "https://8453.rpc.thirdweb.com",
					},
					sponsorGas: true,
				}}
				chains={[
					{ id: 1, rpc: getRPC(1) },
					{ id: 8453, rpc: getRPC(8453) },
					{ id: 42161, rpc: getRPC(42161) },
					{ id: 10, rpc: getRPC(10) },
					{ id: 7777777, rpc: getRPC(7777777) },
				]}
				theme={lightTheme({
					colors: {
						accentText: "#514AF3",
						primaryButtonBg: "#514AF3",
						accentButtonText: "#000",
					},
				})}
				connectButton={{ label: "Log In" }}
				connectModal={{ size: "wide" }}
			/>
		</div>
	);
}
