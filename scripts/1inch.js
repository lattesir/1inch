#!/usr/bin/env node

require("dotenv").config();
const { OneInch, ChainId } = require("../lib/index.js");
const { program } = require("commander");
const { ethers } = require("ethers");
const Decimal = require("decimal.js-light");

const chainId = ChainId[process.env["1inch_chainId"].toUpperCase()];
const oneInch = new OneInch(chainId);

async function approveTransaction(tokenSymbol, { humanAmount, dryRun }) {
    const token = await fetchToken(tokenSymbol);
    const amount = toRawAmount(humanAmount, token.decimals);
    const txRequest = await oneInch.approveTransaction(token.address, amount.toString());
    if (dryRun) {
        console.log(txRequest);
    } else {
        const signer = getSigner();
        const txResponse = await signer.sendTransaction(txRequest);
        const txReceipt = await txResponse.wait();
        console.log({ "transactionHash": txReceipt.transactionHash });
    }
}

async function fetchToken(tokenSymbol) {
    const response = await oneInch.tokens();
    const tokens = Object.values(response.tokens);
    return tokens.find((token) => token.symbol === tokenSymbol);
}

async function quote(
    fromTokenSymbol,
    toTokenSymbol,
    humanAmount,
    options = {}
) {
    const fromToken = await fetchToken(fromTokenSymbol);
    const toToken = await fetchToken(toTokenSymbol);
    const amount = toRawAmount(humanAmount, fromToken.decimals);
    const response = await oneInch.quote(
        fromToken.address,
        toToken.address,
        amount,
        options
    );
    const { fromTokenAmount, toTokenAmount } = response;
    const price = calculatePrice(fromToken, fromTokenAmount, toToken, toTokenAmount);
    console.log(JSON.stringify({...response, price}, undefined, 4));
}

async function swap(
    fromTokenSymbol,
    toTokenSymbol,
    humanAmount,
    slippage,
    options
) {
    const fromToken = await fetchToken(fromTokenSymbol);
    const toToken = await fetchToken(toTokenSymbol);
    const amount = toRawAmount(humanAmount, fromToken.decimals);
    const signer = getSigner();
    const fromAddress = await signer.getAddress();
    const response = await oneInch.swap(
        fromToken.address,
        toToken.address,
        amount,
        fromAddress,
        slippage,
        options
    );
        
    if (options.dryRun) {
        const { fromTokenAmount, toTokenAmount } = response;
        const price = calculatePrice(fromToken, fromTokenAmount, toToken, toTokenAmount);
        console.log(JSON.stringify({...response, price}, "", 4));
    } else {
        const txRequest = response.tx;
        delete txRequest.gas;
        const txResponse = await signer.sendTransaction(txRequest);
        const txReceipt = await txResponse.wait();
        console.log({ "transactionHash": txReceipt.transactionHash });
    }
}

function toRawAmount(humanAmount, decimals) {
    if (humanAmount !== undefined) {
        const scale = new Decimal(10).pow(decimals);
        const rawAmount = new Decimal(humanAmount).mul(scale);
        return rawAmount.toFixed(0);
    } else {
        return undefined;
    }
}

function toHumanAmount(rawAmount, decimals) {
    const scale = new Decimal(10).pow(decimals);
    const humanAmount = new Decimal(rawAmount).div(scale);
    return humanAmount.toNumber();
}

function calculatePrice(fromToken, fromTokenAmount, toToken, toTokenAmount) {
    const fromTokenHumanAmount = toHumanAmount(fromTokenAmount, fromToken.decimals);
    const toTokenHumanAmount = toHumanAmount(toTokenAmount, toToken.decimals);
    return toTokenHumanAmount / fromTokenHumanAmount;
}

function getSigner() {
    const provider = ethers.getDefaultProvider(process.env["1inch_rpcUrl"]);
    return new ethers.Wallet(process.env["1inch_privateKey"], provider);
}

async function main() {
    program
        .command("healthcheck")
        .action(async () => {
            console.log(await oneInch.healthcheck());
        });

    program
        .command("approveSpender")
        .action(async () => {
            console.log(await oneInch.approveSpender());
        });

    program
        .command("tokens")
        .action(async () => {
            console.log(await oneInch.tokens());
        });

    program
        .command("token")
        .argument("<tokenSymbol>")
        .action(async (tokenSymbol) => {
            console.log(await fetchToken(tokenSymbol));
        });

    program
        .command("liquiditySources")
        .action(async () => {
            console.log(await oneInch.liquiditySources());
        });

    program
        .command("presets")
        .action(async () => {
            console.log(await oneInch.presets());
        });

    program
        .command("approveTransaction")
        .option("--human-amount <humanAmount>", "", undefined)
        .option("--dry-run")
        .argument("<tokenSymbol>")
        .action(approveTransaction);

    program
        .command("approveAllowance")
        .arguments("<tokenSymbol> <walletAddress>")
        .action(async (tokenSymbol, walletAddress) => {
            const token = await fetchToken(tokenSymbol);
            console.log(await oneInch.approveAllowance(token.address, walletAddress));
        });

    program
        .command("quote")
        .option("--protocols <protocols>")
        .option("--fee <fee>", "", parseFloat)
        .option("--gas-limit <gasLimit>", "", parseInt)
        .option("--connector-tokens <connectorTokens>")
        .option("--complexity-level <complexityLevel>")
        .option("--main-route-parts <mainRouteParts>", "", parseInt)
        .option("--parts <parts>", "", parseInt)
        .option("--gas-price <gasPrice>")
        .arguments("<fromTokenSymbol> <toTokenSymbol> <humanAmount>")
        .action(quote);

    program
        .command("swap")
        .option("--protocols <protocols>")
        .option("--dest-receiver <destReceiver>")
        .option("--referrer-address <referrerAddress>")
        .option("--fee <fee>", "", parseFloat)
        .option("--gas-price <gasPrice>")
        .option("--disable-estimate")
        .option("--permit <permit>")
        .option("--burn-chi")
        .option("--no-allow-partial-fill")
        .option("--parts <parts>", "", parseInt)
        .option("--main-route-parts <mainRouteParts>", "", parseInt)
        .option("--connector-tokens <connectorTokens>")
        .option("--complexity-level <complexityLevel>")
        .option("--gas-limit <gasLimit>", "", parseInt)
        .option("--dry-run")
        .argument("<fromTokenSymbol>")
        .argument("<toTokenSymbol>")
        .argument("<humanAmount>")
        .argument("[slippage]", "", parseFloat, 0.5)
        .action(swap);

    await program.parseAsync();
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
