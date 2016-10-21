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

// chain.addPeer(`grpcs://${peers[0].discovery_host}:${peers[0].discovery_port}`, { pem: certificate });

chain.enroll(users[0].username, users[0].secret, (err, user) => {
  if (err) { debug(err) };

  chain.setRegistrar(user);

  const registrationRequest = {
    enrollmentID: 'kyrie',
    account: 'group1',
    affiliation: '0001'
  }

  chain.registerAndEnroll(registrationRequest, (err, user) => {
    if (err) { debug(err) };
    debug(user);
  });
});
