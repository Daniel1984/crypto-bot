const { WSv2 } = require('bitfinex-api-node')

const MARKET_MAKING_MAX_FREQUENCY = 500
const MARKET_MAKER_TYPE = 'LIMIT'
const MARKET_MAKER_SYMBOL = 'tBTCUSD'
const MARKET_STATUS_FOR_PAIR = 'deriv:tBTCF0:USTF0'
const MARKET_MAKER_BALANCE = 1000

class Bot {
  constructor(opts = {}) {
    opts = {
      transform: true,
      url: 'wss://test.bitfinex.com/ws/2',
      autoReconnect: true,
      ...opts,
    }
    
    this._ws = new WSv2(opts)
    this._wallet = {}
    this._trades = {}
    this._orderBook = {}
    this._currentMarketPrice = 0
    this._marketMakerType = MARKET_MAKER_TYPE
    this._marketSymbol = MARKET_MAKER_SYMBOL
    this._marketStatusFor = MARKET_STATUS_FOR_PAIR
    this._marketMakerBalance = MARKET_MAKER_BALANCE
  }

  _isMarketMakerOperational() {
    return this._ws.isOpen()
      && Object.keys(this._wallet).length
      && Object.keys(this._orderBook).length
      && this._currentMarketPrice
  }

  _randomSpread() {
    console.log('creating random spread')
    console.log('w - ', this._wallet)
    console.log('ob - ', this._orderBook)
    console.log('cp - ', this._currentMarketPrice)
  }

  asMarketMaker({ frequency } = { frequency: MARKET_MAKING_MAX_FREQUENCY }) {
    if (frequency < MARKET_MAKING_MAX_FREQUENCY) {
      throw new Error(`max allowed frequency is 1 x ${MARKET_MAKING_MAX_FREQUENCY}ms`)
    }

    this._marketMakerInterval = setInterval(() => {
      if (!this._isMarketMakerOperational()) return

      switch (this._marketMakerStrategy) {
        default:
          this._randomSpread()
          break;
      }
    }, frequency)

    return this
  }

  withMarketMakerBalance(balance = MARKET_MAKER_BALANCE) {
    this._marketMakerBalance = balance
    return this
  }

  withMarketMakerType(type = MARKET_MAKER_TYPE) {
    this._marketMakerType = type
    return this
  }

  makeMarketForSymbol(pair = MARKET_MAKER_SYMBOL) {
    this._marketSymbol = pair
    return this
  }

  withStatusFor(status = MARKET_STATUS_FOR_PAIR) {
    this._marketStatusFor = status
    return this
  }

  cancelMarketMaker() {
    clearInterval(this._marketMakerInterval)
    return this
  }

  async start() {
    try {
      await this._ws.open()
      await this._ws.auth()

      this._ws.subscribe('book', { symbol: this._marketSymbol })
      this._ws.subscribe('status', { key: this._marketStatusFor })

      this._ws.onWalletUpdate({}, (wallet) => {
        const { currency, balance } = wallet
        this._wallet[currency] = balance
      })
  
      this._ws.onWalletSnapshot({}, (wallets) => {
        wallets.forEach(({ currency, balance }) => {
          this._wallet[currency] = balance
        })
      })
      
      this._ws.onStatus({}, (resp) => {
        this._currentMarketPrice = resp[14]
      })
  
      this._ws.onOrderBook({ symbol: this._marketSymbol }, ({ bids, asks }) => {
        this._orderBook[this._marketSymbol] = { bids, asks }
      })
  
      // below for testing in investigation
      this._ws.getChannelData({ symbol: this._marketSymbol }, (resp) => {
        console.log('getChannelData - ', resp)
      })
  
      this._ws.onOrderSnapshot({ symbol: this._marketSymbol }, (resp) => {
        console.log('onOrderSnapshot - ', resp)
      })
  
      this._ws.onBalanceInfoUpdate({}, (info) => {
        console.log('balance info - ', info)
      })
    } catch (error) {
      console.error(error)
    }

    return this
  }

  stop() {
    this.cancelMarketMaker()
    if (this._ws.isOpen()) {
      this._ws.close()
    }
  }
}

module.exports = Bot