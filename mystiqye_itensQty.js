const {BigQuery} = require('@google-cloud/bigquery');
const cloudTasks = require('@google-cloud/tasks');
const client = new cloudTasks.CloudTasksClient();
const parent = client.queuePath('bigdata-bernard', 'us-central1', 'first-queue');
const bodyParser = require('body-parser');
const express = require('express');
const rp = require('request-promise');

const app = express();

app.enable('trust proxy');
app.use(bodyParser.raw());
app.use(bodyParser.json());
app.use(bodyParser.text());

const task = {
  appEngineHttpRequest: {
      httpMethod: 'POST',
      relativeUri: '/listening',
  },
};

var rows = '';
var known_list = new Array();
var final_list = new Array();
var count_seller = 0;
var count_row = 0;
var im_first = 'n';

app.get('/start2', (req, res) => {
  
  query_inicial();
  res.status(200);
  res.send('INICIOU');
  res.end();

});

async function query_inicial(){
  
    var options = {
        method: 'GET',
        resolveWithFullResponse: true,
        uri: 'https://turbo-v1-americanas.b2w.io/slug/sitemap/seller?limit=100000',
        headers: {
            "content-type": "application/json",
            "accept": "application/json",
        },
        json: true
    };
    rp(options).then(async function (repos) {
        for (i = 0; i < repos.body.itens.length; i++) {
            final_list.push(repos.body.itens[i].id);
        }

        queueing()

    })
    .catch(function (err) {
        console.log(err);
    });
}


async function queueing(){

  if(count_row < final_list.length){
    for (i = 0; i < 5; i++) {
      if(count_row < final_list.length){
        
        var payload = final_list[count_row];
        task.appEngineHttpRequest.body = Buffer.from(payload).toString('base64');
        const request = {
            parent: parent,
            task: task,
        };

        try {
          const [response] = await client.createTask(request);
          console.log(count_row + ' --> QUEUED');
          } catch(e) {
          return;
          console.log(count_row + ' --> ERRO QUEUED');

          }

         
        count_row++;
      }else{
        if(im_first == 'n'){
          im_first = 's';
          setTimeout(function(){
            query_inicial();
          }, 15000);
        } 
      }
    }
    setTimeout(function(){
       queueing();
    }, 1000);
  }else{
    if(im_first == 'n'){
      im_first = 's';
      setTimeout(function(){
        query_inicial();
      }, 15000);
    }
  }
}


























app.post('/listening', (req, res) => {
  
  var cnpj = req.body;

  var options = {
    method: 'GET',
    uri: 'https://mystique-v2-americanas.b2w.io/search?sortBy=lowerPrice&source=omega&filter={"id":"variation.sellerID","value":"' + cnpj + '","fixed":true}&limit=1',
    resolveWithFullResponse: true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36',
      'Cookie': 'B2W-PID=1554749288806.0.9131708692902571; B2W-UID=va_20198115489_558.6748678666752; _ga=GA1.3.1244774161.1554749290; _gcl_au=1.1.2118044171.1554749291; _fbp=fb.2.1554749290676.2072040790; cto_lwid=ecfec138-0d2d-4b1f-9786-460e8eedb827; WA_identificacao=hugolevino%40msn.com; feather.rank=%7B%22search%22%3A%22star%20wars%E2%86%872%22%7D; __crto_ml_adb=1; SELECTED_FROM_ADDRESSES=false; persistentCep=13467500; b2wRegion=SP_INTERIOR; searchTestAB=out; catalogTestAB=new; _gid=GA1.3.717962050.1556740883; b2wcrmts=VE%3DPAC%2CMU%3DTC%2CRC%3DT0%2CVI%3DNI; MobileOptOut=1; b2wDevice=eyJvcyI6IldpbmRvd3MgTlQiLCJvc1ZlcnNpb24iOiI2LjEiLCJ2ZW5kb3IiOiJDaHJvbWUiLCJ0eXBlIjoiZGVza3RvcCIsIm1rdE5hbWUiOiJDaHJvbWUgNzMiLCJtb2RlbCI6IjczIiwibW9iaWxlT3B0T3V0IjoiZmFsc2UifQ==; b2wDeviceType=desktop; b2wChannel=ACOM; B2W-IU=false; bm_mi=714EE5D48C17A8982AAD1DE21B96EF0B~IUmwk2G7U3tBMRfjS3LGWmBF9HjweWlhwO/vIFkqZrkE6p5Qo2N3WCy7FoGZoNl8OUwbv/U1t91ZepvcPhhi/ezRoPZbyA1k1wbeQu2+BRWZZq4ENfBkywY4/PN+QHGOIkr/mf6a6E5rKb3DJA1F7CJ1YQ95jVyG8cCKSOmRLxWxVv5CjMtevSm9baDhbtVWJFpD6a1g6Zwwb1jNXwacPnnLEuaqkcLZtI05xf5zP+gGjNIK/u0LFOxtj7MRsAlywCTA/13mrTaNaMIq9rid38li8QvZG/EPjhOv9vKhoew=; hj-pagetime=1556758131122; B2W-SID=99.922193095744692019132148133; ak_bmsc=D7EB13D41A8DFCF64437C05C9D6F5FAB42C9B9A613400000713ECA5C3F7B0635~pli6o67rPkUmYuY4ZxBzrsPqVPln5SwfrwtCZ372lK9NlAQ3z1eljZddM0Cy4zp2sMJAtl3bXTu3eytkQz9hQdzmiq2K0JR3zDS1Ddx7U6lpa8xbCnaFqVdKYrwP893MfVTBldMos1g4wRQF4/KVvyu8gwrQatV5xtAhVXddyK2/hD2Ka5xUWKbwYWoibtmC+z4RgxWFPPxg0pHVKJGbeE8Rzdpe4U1oI3Dc7V+mbxEGDQTaIV7U08CG1hyreESDwm; AMCVS_14B422CE52782FA90A490D4D%40AdobeOrg=1; AMCV_14B422CE52782FA90A490D4D%40AdobeOrg=1099438348%7CMCIDTS%7C18018%7CMCMID%7C73930383654316240590075028559476579558%7CMCAAMLH-1557345681%7C4%7CMCAAMB-1557362932%7CRKhpRz8krg2tLO6pguXWp5olkAcUniQYPHaMWWgdJ3xzPWQmdj0y%7CMCOPTOUT-1556765332s%7CNONE%7CMCAID%7CNONE%7CvVersion%7C2.1.0; s_cc=true; bm_sv=2A72E698E81383D00E4DDED4DD5E15D9~QT/EtD/ObiDgEiiQbIUZKmtWeEP6VkZm/plKiZMrjT+FyPU2imbfzOnXYhTsG/5DqeioGklkqB0FQaTp9MDNk+66ipYm3Nw2/5sy3pHiq4nqA/YkwHWCeDRRy0eo7MEp6tYp0oMQHGognrCwOepvGHNdE7kfWJA6atD1OZW6rEg=; catalog.source=zion',
      'teste': cnpj
    },
    json: true,
    timeout: 30000
  };
   
  rp(options).then(function (repos) {
  
    var real_cnpj = repos.request.headers.teste;

    query(real_cnpj, repos.body._result.total);

    res.status(200);
    res.send(real_cnpj + ' --> ' + repos.body._result.total);
    res.end();

  })
  .catch(function (response) {
    res.status(400);
      res.send('DEU XABU');
      res.end();
  });
  
});

app.get('/start', (req, res) => {
  
  res.status(200);
  res.send('OI???');
  res.end();

});

async function query(real_cnpj, qty_itens) {

  var cnpj_to_insert = parseInt(real_cnpj);
  var qty_to_insert = parseInt(qty_itens);
  const bigqueryClient = new BigQuery();

  var today = new Date();
  var today = today.toISOString();

  const query = 'INSERT INTO `bigdata-bernard.my_new_dataset.robo_mystique_qty_itens` (cnpj, qty) VALUES (' + cnpj_to_insert + ', "' + qty_to_insert + '")';
  const options = {
    query: query,
    location: 'US',
  };

  const [job] = await bigqueryClient.createQueryJob(options);

  rows = await job.getQueryResults();
  
}



const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});
