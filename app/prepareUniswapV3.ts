import { Percent, Token } from "@uniswap/sdk-core";
import {
	computePoolAddress,
	FeeAmount,
	MintOptions,
	nearestUsableTick,
	NonfungiblePositionManager,
	Pool,
	Position,
} from "@uniswap/v3-sdk";
import { ethers } from "ethers";
import IUniswapV3PoolABI from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json";
import { createThirdwebClient, prepareTransaction } from "thirdweb";
import { PoolTransaction } from "./Confirm";
import { config } from "./config";
const client = createThirdwebClient({
	clientId: config.THIRDWEB_CLIENT_ID as string,
});
export default async function prepareUniswapV3PoolTransaction(
	data: PoolTransaction
) {
	const {
		pool_address,
		npm_address,
		token_address_a,
		token_address_b,
		decimals_a,
		decimals_b,
		amount_a,
		amount_b,
		fee_amount,
		chain,
		from_address,
	} = data.data;
	const tokenA: Token = new Token(chain.id, token_address_a, decimals_a);
	const tokenB: Token = new Token(chain.id, token_address_b, decimals_b);
	// @ts-expect-error todo
	const fee: FeeAmount = FeeAmount[fee_amount];

	// @ts-expect-error todo
	const provider = new ethers.providers.JsonRpcProvider(
		`${chain.rpc}/${process.env.THIRDWEB_CLIENT_ID}`
	);
	const currentPoolAddress = computePoolAddress({
		factoryAddress: pool_address,
		tokenA,
		tokenB,
		fee,
	});

	if (!currentPoolAddress) throw new Error("currentPoolAddress");

	// ====== retrieve pool contract

	const poolContract = new ethers.Contract(
		currentPoolAddress,
		IUniswapV3PoolABI.abi,
		provider
	);

	if (!poolContract) throw new Error("poolContract");

	const [liquidity, slot0] = await Promise.all([
		poolContract.liquidity(),
		poolContract.slot0(),
	]);

	if (!liquidity || !slot0) throw new Error("liquidity || slot0");
	// ====== configure pool

	const configuredPool = new Pool(
		tokenA,
		tokenB,
		fee,
		slot0.sqrtPriceX96.toString(),
		liquidity.toString(),
		slot0.tick
	);

	if (!configuredPool) throw new Error("configuredPool");

	// ====== configure position

	const position = Position.fromAmounts({
		pool: configuredPool,
		tickLower:
			nearestUsableTick(
				configuredPool.tickCurrent,
				configuredPool.tickSpacing
			) -
			configuredPool.tickSpacing * 2,
		tickUpper:
			nearestUsableTick(
				configuredPool.tickCurrent,
				configuredPool.tickSpacing
			) +
			configuredPool.tickSpacing * 2,
		amount0: amount_a,
		amount1: amount_b,
		useFullPrecision: true,
	});

	if (!position) throw new Error("position");
	// ====== set mint options

	const mintOptions: MintOptions = {
		recipient: from_address,
		deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 min
		slippageTolerance: new Percent(50, 10_000), //  5%
	};

	if (!mintOptions) throw new Error("mintOptions");

	// ====== get calldata for minting a position
	const { calldata, value } = NonfungiblePositionManager.addCallParameters(
		position,
		mintOptions
	);

	if (!calldata || !value) throw new Error("calldata || value");
	// ====== prepare and confirm transactions

	const transaction = {
		data: calldata,
		to: npm_address,
		value: value,
		from: from_address,
		// @ts-expect-error todo
		maxFeePerGas: ethers.utils.parseUnits("100", "gwei"), // Max fee per gas (example: 100 gwei)
		// @ts-expect-error todo
		maxPriorityFeePerGas: ethers.utils.parseUnits("2", "gwei"),
	};

	// @ts-expect-error todo
	const t = prepareTransaction({
		...transaction,
		client,
		chain,
	});

	return t;
}
