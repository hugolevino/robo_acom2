const {BigQuery} = require('@google-cloud/bigquery');
const cloudTasks = require('@google-cloud/tasks');
const client = new cloudTasks.CloudTasksClient();
const parent = client.queuePath('bigdata-bernard', 'us-central1', 'first-queue');
const bodyParser = require('body-parser');
const express = require('express');

const app = express();

app.use(bodyParser.raw());
app.use(bodyParser.json());
app.use(bodyParser.text());

const task = {
	appEngineHttpRequest: {
    	httpMethod: 'POST',
    	relativeUri: '/listening',
	},
};

var rp = require('request-promise');
var fs = require('fs');

var rows = '';
var known_list = new Array();
var final_list = new Array();
var count_seller = 0;
var count_row = 0;
var im_first = 'n';

app.get('/start', (req, res) => {
 	
    query();
		res.status(200);
	  res.send('INICIOU');
	  res.end();

});

async function query() {

	rows = '';
	known_list = new Array();
	final_list = new Array();
	count_seller = 0;
	count_row = 0;
	im_first = 'n';

	const bigqueryClient = new BigQuery();

	const query = `SELECT cnpj FROM \`bigdata-bernard.my_new_dataset.data_ativacao\``;
	const options = {
		query: query,
		location: 'US',
	};

	const [job] = await bigqueryClient.createQueryJob(options);
	console.log(`Job ${job.id} started.`);

	rows = await job.getQueryResults();

	for (i = 0; i < rows[0].length; i++) {
		known_list.push(rows[0][i].cnpj);
	}

	get_cats();
  
}


function get_cats(){
	
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

	rp(options).then(function (repos) {
		

		for (i = 0; i < repos.body.itens.length; i++) {
			cnpj_to_int = repos.body.itens[i].id;
			if (known_list.indexOf(parseInt(cnpj_to_int)) == -1) {
				if (final_list.indexOf(parseInt(cnpj_to_int)) == -1) {
					var teste = parseInt(cnpj_to_int);
					var teste = teste.toString();
					final_list.push(teste);
					count_seller++;
					console.log(count_seller + ' -> ' + cnpj_to_int);
				}
			}
		}

		queueing();

	})
	.catch(function (err) {
		
		console.log(err);

	});
	
}

async function queueing(){

	if(count_row < final_list.length){
		for (i = 0; i < 10; i++) {
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
						query();
					}, 15000);
				}	
			}
		}
		setTimeout(function(){
			 queueing();
		}, 5000);
	}else{
		if(im_first == 'n'){
			im_first = 's';
			setTimeout(function(){
				query();
			}, 15000);
		}
	}
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});
