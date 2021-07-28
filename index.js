import axios from 'axios'

export class OneInchError extends Error {
    constructor(message) {
        super(message)
        this.name = this.constructor.name
        Error.captureStackTrace(this, this.constructor)
    }
}

export class OneInchTimeoutError extends OneInchError {}

export class OneInch {
    constructor(chainId = 1, timeout = 5000) {
        this.fetcher = axios.create({
            baseURL: `https://api.1inch.exchange/v3.0/${chainId}`,
            timeout: timeout,
        })
    }

    async approveCalldata(tokenAddress, { amount, infinity = true } = {}) {
        if (amount !== undefined) { infinity = undefined }
        const params = this._buildParams({ tokenAddress }, { amount, infinity })
        const res = await this._request('/approve/calldata', params)
        return res.data
    }

    async approveSpender() {
        const res = await this._request('/approve/spender')
        return res.data
    }

    async healthcheck() {
        const res = await this._request('healthcheck')
        return res.data
    }

    async quote(fromTokenAddress, toTokenAddress, amount,
        {
            fee,
            protocols,
            gasPrice,
            complexityLevel,
            connectorTokens,
            gasLimit,
            parts,
            mainRouteParts
        } = {}
    ) {
        const params = this._buildParams(
            { fromTokenAddress, toTokenAddress, amount },
            {
                fee,
                protocols,
                gasPrice,
                complexityLevel,
                connectorTokens,
                gasLimit,
                parts,
                mainRouteParts
            }
        )
        const res = await this._request('/quote', params)
        return res.data
    }

    async swap (fromTokenAddress, toTokenAddress, amount, fromAddress, slippage = 0.5,
        {
            protocols,
            destReceiver,
            referrerAddress,
            fee,
            gasPrice,
            burnChi,
            complexityLevel,
            connectorTokens,
            allowPartialFill,
            disableEstimate,
            gasLimit,
            mainRouteParts,
            parts
        } = {}
    ) {
        const params = this._buildParams(
            { fromTokenAddress, toTokenAddress, amount, fromAddress, slippage },
            {
                protocols,
                destReceiver,
                referrerAddress,
                fee,
                gasPrice,
                burnChi,
                complexityLevel,
                connectorTokens,
                allowPartialFill,
                disableEstimate,
                gasLimit,
                mainRouteParts,
                parts
            }
        )
        const res = await this._request('/swap', params)
        return res.data
    }

    async protocols () {
        const res = await this._request('/protocols')
        return res.data
    }

    async tokens () {
        const res = await this._request('/tokens')
        return res.data
    }

    _buildParams (required = {}, optional = {}) {
        const params = {}

        for (const [key, value] of Object.entries(required)) {
            if (value === undefined) {
                throw new Error(`required paramter: ${key}`)
            } else {
                params[key] = value
            }
        }

        for (const [key, value] of Object.entries(optional)) {
            if (value !== undefined) {
                params[key] = value 
            }
        }

        return params
    }

    async _request(url, params = undefined) {
        try {
            return await this.fetcher.get(url, { params })
        } catch (cause) {
            let error = undefined
            if (cause.code == 'ECONNABORTED') {
                error = new OneInchTimeoutError(cause.message)
            } else if (cause.response) {
                error = new OneInchError(cause.response.data.message)
            } else {
                error = new OneInchError(cause.message)
            }
            error._cause = cause
            throw error
        }
    }

}
