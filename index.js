const Bot = require('./lib/bot')

const bot = new Bot({
  apiKey: '',
  apiSecret: '',
})

bot
  .asMarketMaker({ frequency: 500 })
  .withMarketMakerType('LIMIT')
  .withMarketMakerBalance(1000)
  .makeMarketForSymbol('tBTCUSD')
  .withStatusFor('deriv:tBTCF0:USTF0')
  .start()

setTimeout(async () => {
  try {
    await bot.stop()
  } catch (error) {
    console.error(error)
  }
}, 10000)