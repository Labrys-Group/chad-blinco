import { Plugin } from "@elizaos/core";
import { evmWalletProvider } from "@elizaos/plugin-evm";
import { erc20DeploymentAction } from "./actions/erc20DeploymentPlugin";

const evmContractDeployerPlugin: Plugin = {
    name: "evm-contract-deployer",
    description:
        "A plugin for deploying contracts on the Ethereum or EVM compatible blockchain",
    // @ts-ignore
    providers: [evmWalletProvider],
    actions: [erc20DeploymentAction],
};

export default evmContractDeployerPlugin;
