const fs    = require('fs');
const path  = require('path');
const hfc   = require('hfc');
const debug = require('debug')('script');

process.env['GRPC_SSL_CIPHER_SUITES'] = 'ECDHE-RSA-AES128-GCM-SHA256:' +
    'ECDHE-RSA-AES128-SHA256:' +
    'ECDHE-RSA-AES256-SHA384:' +
    'ECDHE-RSA-AES256-GCM-SHA384:' +
    'ECDHE-ECDSA-AES128-GCM-SHA256:' +
    'ECDHE-ECDSA-AES128-SHA256:' +
    'ECDHE-ECDSA-AES256-SHA384:' +
    'ECDHE-ECDSA-AES256-GCM-SHA384';

const credential = JSON.parse(fs.readFileSync(path.resolve(process.env.FABRIC_CREDENTIAL_PATH)));
const certificate = fs.readFileSync(path.resolve(process.env.FABRIC_CERTIFICATE_PATH));
const networkId = credential.peers[0].network_id;
const ca = credential.ca[`${networkId}-ca`];
const users = credential.users;
const peers = credential.peers;

const chain = hfc.newChain('my-chain');
chain.setKeyValStore(hfc.newFileKeyValStore(path.resolve(`tmp/stores/${networkId}`)));
chain.setMemberServicesUrl(`grpcs://${ca.url}}`, { pem: certificate });
chain.addPeer(`grpcs://${peers[0].discovery_host}:${peers[0].discovery_port}`, { pem: certificate });
chain.setDevMode(true);

let user;

enroll();

function enroll() {
  debug('enrolling user admin ...');

  chain.enroll(users[0].username, users[0].secret, (err, admin) => {
    if (err) {
      debug("ERROR: failed to register admin: %s", err);
      process.exit(1);
    }

    user = admin;

    chain.setDeployWaitTime(60);
    chain.setInvokeWaitTime(60);
    deploy();
  });
}

function deploy() {
  debug('deploying chaincode; please wait ...');

  const req = {
    chaincodeName: 'my-chaincode',
    fcn: 'init',
    args: ['a', '100', 'b', '200']
  };

  const tx = user.deploy(req);
  tx.on('complete', (results) => {
    debug("deploy complete; results: %j", results);
    chaincodeID = results.chaincodeID;
    query();
  });
  tx.on('error', (err) => {
    debug("Failed to deploy chaincode: request=%j, error=%k", req, err);
    process.exit(1);
  });
}

function query() {
  debug('querying chaincode ...');

  var req = {
    chaincodeID: chaincodeID,
    fcn: "query",
    args: ["a"]
  };

  var tx = user.query(req);
  tx.on('complete', (results) => {
    debug("query completed successfully; results=%j", results);
    process.exit(0);
  });
  tx.on('error', (err) => {
    debug("Failed to query chaincode: request=%j, error=%k", req, err);
    process.exit(1);
  });
}
