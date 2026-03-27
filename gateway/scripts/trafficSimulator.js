require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.SIMULATION_BASE_URL;
if (!BASE_URL) {
  console.error("SIMULATION_BASE_URL not defined in .env");
  process.exit(1);
}

//helper sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));


//NORMAL TRAFFIC
async function normalTraffic() {
    console.log("Starting NORMAL traffic...");

    for(let i = 0; i < 30; ++i) {
        await axios.get(`${BASE_URL}/users`);
        await sleep(500); //steady requests
    }

    console.log("Normal traffic done\n");
}


//BURST TRAFFIC
async function burstTraffic() {
  console.log("Starting BURST traffic...");

  for (let i = 0; i < 30; i++) {
    axios.get(`${BASE_URL}/users`); // no await = burst
  }

  await sleep(2000);

  console.log("Burst traffic done\n");
}


//MALICIOUS TRAFFIC
async function maliciousTraffic() {
  console.log("Starting MALICIOUS traffic...");

  const endpoints = [
    '/users',
    '/admin',
    '/login',
    '/data',
    '/random'
  ];

  for (let i = 0; i < 50; i++) {
    const randomEndpoint =
      endpoints[Math.floor(Math.random() * endpoints.length)];

    axios.get(`${BASE_URL}${randomEndpoint}`).catch(() => {});
  }

  await sleep(2000);

  console.log("Malicious traffic done\n");
}



//RUN ALL
async function runSimulation() {
  console.log("🚀 Traffic Simulation Started\n");

  await normalTraffic();
  await sleep(2000);

  await burstTraffic();
  await sleep(2000);

  await maliciousTraffic();

  console.log("🎯 Simulation Complete");
}

runSimulation();