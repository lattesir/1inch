const axios = require("axios");

const ChainId = {
    MAINNET: 1,
    BSC: 56,
    POLYGON: 137,
    OPTIMISM: 10,
    ARBITRUM: 42161,
    GNOSIS: 100,
    AVALANCH: 43114,
    FANTOM: 250
}

class OneInch {
    constructor(chainId, config = {}) {
        this.fetcher = axios.create({
            timeout: 30000,
            ...config,
            baseURL: `https://api.1inch.exchange/${this.version}/${chainId}`
        })
    }

    async healthcheck() {
        return await this._fetch("/healthcheck");
    }

    async approveSpender() {
        return await this._fetch("/approve/spender");
    }

    async approveTransaction(tokenAddress, amount) {
        const params = (amount === undefined) ? { tokenAddress } : { tokenAddress, amount };
        return await this._fetch("/approve/transaction", params);
    }

    async approveAllowance(tokenAddress, walletAddress) {
        return await this._fetch("/approve/allowance", { tokenAddress, walletAddress });
    }

    async liquiditySources() {
        return await this._fetch("/liquidity-sources");
    }

    async tokens() {
        return await this._fetch("/tokens");
    }

    async presets() {
        return await this._fetch("/presets");
    }

    async quote(fromTokenAddress, toTokenAddress, amount, options = {}) {
        return await this._fetch('/quote', {
            fromTokenAddress,
            toTokenAddress,
            amount,
            ...options
        })
    }

    async swap(fromTokenAddress, toTokenAddress, amount, fromAddress, slippage, options = {}) {
        return await this._fetch('/swap', {
            fromTokenAddress,
            toTokenAddress,
            amount,
            fromAddress,
            slippage,
            ...options
        })
    }

    get version() {
        return "v4.0";
    }

    async _fetch(endpoint, params) {
        const response = await this.fetcher.get(endpoint, { params });
        return response.data;
    }
}

module.exports = {
    ChainId,
    OneInch
}
