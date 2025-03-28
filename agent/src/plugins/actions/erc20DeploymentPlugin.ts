import {
    Action,
    composeContext,
    generateObjectDeprecated,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
} from "@elizaos/core";

import {
    initWalletProvider,
    SupportedChain,
    Transaction,
    WalletProvider,
} from "@elizaos/plugin-evm";
import { parseEther, type Hex } from "viem";
import { erc20DeploymentTemplate } from "../templates";
import { erc20Abi, erc20Bytecode } from "../abi/erc20abi";

interface ERC20DeploymentParams {
    name: string;
    symbol: string;
    initialSupply: string;
    fromChain: SupportedChain;
}

export class ERC20DeploymentAction {
    constructor(private walletProvider: WalletProvider) {}

    async deployERC20(params: ERC20DeploymentParams): Promise<Transaction> {
        console.log(
            `Deploying ERC20 token: ${params.name} (${params.symbol}) with initial supply ${params.initialSupply} on ${params.fromChain}`
        );

        this.walletProvider.switchChain(params.fromChain);
        const walletClient = this.walletProvider.getWalletClient(
            params.fromChain
        );

        const contractBytecode = erc20Bytecode;

        try {
            const hash = await walletClient.deployContract({
                abi: erc20Abi,
                account: walletClient.account,
                bytecode: contractBytecode as Hex,
                chain: undefined,
                args: [
                    params.name,
                    params.symbol,
                    BigInt(params.initialSupply.toString()),
                ],
            });

            return {
                hash,
                from: walletClient.account.address,
                to: null, // Contract creation
                data: contractBytecode as Hex,
                value: parseEther("0"),
            };
        } catch (error) {
            throw new Error(`ERC20 deployment failed: ${error.message}`);
        }
    }
}

export const erc20DeploymentAction: Action = {
    name: "deployERC20",
    description: "Deploy a new ERC20 token contract",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: any,
        callback?: HandlerCallback
    ) => {
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        console.log("ERC20 deployment action handler called");
        // @ts-ignore
        const walletProvider = await initWalletProvider(runtime);
        const action = new ERC20DeploymentAction(walletProvider);

        const deploymentParams = await buildDeploymentDetails(
            state,
            runtime,
            walletProvider
        );

        try {
            const deploymentResp = await action.deployERC20(deploymentParams);
            if (callback) {
                callback({
                    text: `Successfully deployed ERC20 token ${deploymentParams.name} (${deploymentParams.symbol})\nTransaction Hash: ${deploymentResp.hash}`,
                    content: {
                        success: true,
                        hash: deploymentResp.hash,
                        tokenName: deploymentParams.name,
                        tokenSymbol: deploymentParams.symbol,
                        chain: deploymentParams.fromChain,
                    },
                });
            }
            return true;
        } catch (error) {
            console.error("Error during ERC20 deployment:", error);
            if (callback) {
                callback({
                    text: `Error deploying ERC20 token: ${error.message}`,
                    content: { error: error.message },
                });
            }
            return false;
        }
    },
    validate: async (runtime: IAgentRuntime) => {
        const privateKey = runtime.getSetting("EVM_PRIVATE_KEY");
        return typeof privateKey === "string" && privateKey.startsWith("0x");
    },
    examples: [
        [
            {
                user: "assistant",
                content: {
                    text: "I'll help you deploy a new ERC20 token named 'MyToken' with symbol 'MTK'",
                    action: "DEPLOY_ERC20",
                },
            },
            {
                user: "user",
                content: {
                    text: "Deploy a new ERC20 token called MyToken",
                    action: "DEPLOY_ERC20",
                },
            },
        ],
    ],
    similes: ["DEPLOY_TOKEN", "CREATE_TOKEN", "NEW_TOKEN"],
};

const buildDeploymentDetails = async (
    state: State,
    runtime: IAgentRuntime,
    wp: WalletProvider
): Promise<ERC20DeploymentParams> => {
    const chains = Object.keys(wp.chains);
    state.supportedChains = chains.map((item) => `"${item}"`).join("|");

    const context = composeContext({
        state,
        template: erc20DeploymentTemplate,
    });

    const deploymentDetails = (await generateObjectDeprecated({
        runtime,
        context,
        modelClass: ModelClass.LARGE,
    })) as ERC20DeploymentParams;

    console.log("Deployment details----------:", deploymentDetails);
    const existingChain = wp.chains[deploymentDetails.fromChain];

    if (!existingChain) {
        throw new Error(
            "The chain " +
                deploymentDetails.fromChain +
                " not configured yet. Add the chain or choose one from configured: " +
                chains.toString()
        );
    }

    return deploymentDetails;
};
