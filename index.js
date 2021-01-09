const fetch = require('node-fetch');
const { Client } = require('whatsapp-web.js');
// const client = new Client({ puppeteer: { headless: false }});
const qrcode = require('qrcode-terminal');
const client = new Client({puppeteer: {
headless: true,  
args: [
      '--no-sandbox',
  ],
}});
var actualValue = 0
var users_eth = []


client.on('qr', (qr) => {
  // Generate and scan this code with your phone
  qrcode.generate(qr, {small: true});
});

client.on('ready', async () => {
  console.log('Client is ready!');
  const rawResponse1 = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=brl,usd&include_24hr_change=true');
  const json1 = await rawResponse1.json();  
  actualValue = json1.ethereum.brl
  setInterval( () => {
    updateValue('ethereum')      
  }, 60000 * 20)  
});

client.on('message', async msg => {
  if (msg.body == '.eth') {
    updateValue('ethereum', msg.from)
  }
  if (msg.body == '.bit') {
    updateValue('bitcoin', msg.from)
  }
  if (msg.body == '.signup') {
    if(!users_eth.find(e => e == msg.from)){
      users_eth.push(msg.from)
      updateValue('ethereum', msg.from)
    }else{
      client.sendMessage(msg.from, 'Já está cadastrado na lista.')
    }
  }
  if (msg.body == '.unsign') {
    users_eth.splice(users_eth.indexOf(msg.from),1);
    client.sendMessage(msg.from, 'Removido da lista.')
  }
  if (msg.body == '.comands') {
    var message = '.eth -> valor atual do ethereum';
    message += '\n.bit -> valor atual do bitcoin';
    message += '\n.signup -> receber atualizações do ethereum a cada 20 minutos';
    message += '\n.unsign -> cancelar assinatura';
    client.sendMessage(msg.from, message)
  }
});

client.initialize();

function updateValue(crypto, chatID){
  fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${crypto}&vs_currencies=brl,usd&include_24hr_change=true`)
  .then(res => res.json())
  .then(json => {
    if(crypto == 'ethereum'){
      var newValue = json.ethereum.brl
      var percDiff = relDiff(actualValue, newValue);
      sendMensage(newValue, json.ethereum.usd, json.ethereum.brl_24h_change, json.ethereum.usd_24h_change, percDiff, actualValue < newValue, crypto, chatID );        
      actualValue = json.ethereum.brl
    }else if(crypto == 'bitcoin'){
      var newValue = json.bitcoin.brl
      var percDiff = relDiff(actualValue, newValue);
      sendMensage(newValue, json.bitcoin.usd, json.bitcoin.brl_24h_change, json.bitcoin.usd_24h_change, percDiff, actualValue < newValue, crypto, chatID );        
    }
  });
}

async function sendMensage(valueBR, valueUSD, br24, usd24, perc, subiu, crypto, chat_id = null){

  // const chats = await client.getChats();
  // const chatID = chat_id || chats[0].id._serialized
  const chatID = chat_id 

  var d = new Date();
  var datestring = d.getDate()  + "/" + (d.getMonth()+1) + "/" + d.getFullYear() + " " +
  d.getHours() + ":" + d.getMinutes();

  var message = ""
  if(crypto == 'ethereum'){
    if (subiu) {
      message += "😳🟩 SUBIU 🟩😳 \n📈 +"
    }else{
      message += "😳🟥 CAIU 🟥😳 \n📉 -"
    }
    message += perc.toFixed(2) + " %"
  }

  message += "\n\n" + crypto.toUpperCase() + " BR: R$ " + valueBR.toFixed(2) ;
  message += "\n" + crypto.toUpperCase() + " USD: US$" + valueUSD.toFixed(2) ;  
  message += "\n\n" + crypto.toUpperCase() + " 24 horas BR " + br24.toFixed(2) + " %";
  message += "\n" + crypto.toUpperCase() + " 24 horas USD " + usd24.toFixed(2) + " %";
  message += "\n\nEm " + datestring ;

  if(chatID){
    client.sendMessage(chatID, message)
  }else{
    users_eth.map(user=>{
      client.sendMessage(user, message)
    })
  }

}

function relDiff(a, b) {
  if (isNaN(+a) || isNaN(+b)){
      return 0;
  }
  return a-b === 0 ? 0 : 100 * Math.abs( ( a - b ) / b  ) || 'error';
}
