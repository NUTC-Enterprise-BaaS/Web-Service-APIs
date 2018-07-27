var express = require('express');
var Web3 = require("web3");
var router = express.Router();

var abi = [{"constant":false,"inputs":[{"name":"index","type":"uint256"},{"name":"voterName","type":"string"}],"name":"addCandidate","outputs":[{"name":"","type":"string"},{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"candidateID","type":"uint256"},{"name":"candidateName","type":"string"}],"name":"vote","outputs":[{"name":"","type":"bool"},{"name":"","type":"string"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"getVoter","outputs":[{"name":"","type":"bool"},{"name":"","type":"string"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"getCandidateCount","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"candidates","outputs":[{"name":"name","type":"string"},{"name":"voteCount","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"index","type":"uint256"}],"name":"getCandidate","outputs":[{"name":"","type":"string"},{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"voters","outputs":[{"name":"voted","type":"bool"},{"name":"candidate","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"addr","type":"address"}],"name":"Vote","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"index","type":"uint256"}],"name":"AddCandidate","type":"event"}]
var address = <ADDRESS>;
var node = new Web3();
var nodeIPs = <NODE_IPS>

router.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "*");
  next();
});

/***
 取得錢包所在的節點
 */
function getNodeIP (account) {
  var get = false;
  for (var index = 0; index < nodeIPs.length; index++) {
    node.setProvider(new Web3.providers.HttpProvider(nodeIPs[index]));
    if (node.eth.accounts.indexOf(account) > -1) {
      return nodeIPs[index];
    }
  }
  return null;
}

/***
 取得候選人代號
 */
function getCandidateID (candidateName) {
  var web3 = node.eth.contract(abi).at(address);
  for (var index = 0; index < web3.getCandidateCount.call().toNumber(); index++) {
    var candidate = web3.getCandidate.call(index);
    if (candidate[0] == candidateName) {
      return index;
    }
  }
  return null;
}

/***
 查詢所有錢包
 */
router.get('/voters', function (req, res) {
  var web3 = node.eth.contract(abi).at(address);
  var voters = [];
  try {
    for (var nodeIndex = 0; nodeIndex < nodeIPs.length; nodeIndex++) {
      node.setProvider(new Web3.providers.HttpProvider(nodeIPs[nodeIndex]));
      for (var index = 0; index < node.eth.accounts.length; index++) {
        voters.push({
          'node': 'node' + (nodeIndex + 1),
          'account': node.eth.accounts[index],
          'balance': node.eth.getBalance(node.eth.accounts[index]).toNumber(),
          'voted': web3.getVoter.call({from: node.eth.accounts[index]})[0]
        })
      }
    }
    res.status(200).send(JSON.stringify({
      'status': 'Success',
      'result': voters
    }));
  } catch (e) {
    res.status(404).send(JSON.stringify({
      'status': 'Error',
      'result': []
    }))
  }
});

/***
 發送乙太幣
 */
router.post('/balance/send', function (req, res) {
  var fromAccount = req.body.from;
  var toAccount = req.body.to;
  var value = req.body.value;
  var nodeIP = getNodeIP(fromAccount);
  var result = {};
  node.setProvider(new Web3.providers.HttpProvider(nodeIP));
  var data = {
    'from': fromAccount,
    'to': toAccount,
    'value': value
  };
  try {
    node.eth.sendTransaction(data, function(err, transactionHash) {
      if (!err) {
        res.status(200).send(JSON.stringify({
          'status': 'Success'
        }))
      } else {
        res.status(404).send(JSON.stringify({
          'status': 'Error'
        }))
      }
    });
  } catch (e) {
    res.status(404).send(JSON.stringify({
      'status': 'Error'
    }))
  }
})

/***
 新增候選人
 */
router.post('/candidate/add', function (req, res) {
  var account = req.body.account;
  var candidateName = req.body.candidateName;
  var nodeIP = getNodeIP(account);
  var password = req.body.password;
  node.setProvider(new Web3.providers.HttpProvider(nodeIP));
  var web3 = node.eth.contract(abi).at(address);
  var candidateCount = web3.getCandidateCount.call().toNumber();
  try {
    node.personal.unlockAccount(account, password, 0);
  } catch (e) {
    res.status(401).send(JSON.stringify({
      'status': 'Error',
      'result': 'This account unlock failed.'
    }));
    return;
  }
  for (var index = 0; index < candidateCount; index++) {
    if(web3.getCandidate.call(index)[0] == candidateName) {
      res.status(409).send(JSON.stringify({
        'status': 'Error',
        'result': 'This name is already exist.'
      }));
      return;
    }
  }
  try {
    var txHash = web3.addCandidate.sendTransaction(candidateCount, candidateName, {from: account});
    var addCandidateEvent = web3.AddCandidate();
    addCandidateEvent.watch(function(err, result) {
      if (!err && result.transactionHash == txHash) {
        res.status(200).send(JSON.stringify({
          'status': 'Success',
          'result': {
            'name': web3.getCandidate.call(candidateCount)[0],
            'count': web3.getCandidate.call(candidateCount)[1].toNumber()
          }
        }));
      }
      addCandidateEvent.stopWatching();
    });
  } catch (e) {
    res.status(404).send(JSON.stringify({
      'status': 'Error',
      'result': 'This account insufficient funds.'
    }));
  }
})

/***
 查詢所有候選人
 */
router.get('/candidate/all', function (req, res) {
  node.setProvider(new Web3.providers.HttpProvider(nodeIPs[0]));
  var candidates = [];
  var web3 = node.eth.contract(abi).at(address);
  try {
    for (var index = 0; index < web3.getCandidateCount.call().toNumber(); index++) {
      var candidate = web3.getCandidate.call(index);
      candidates.push({
        'name': candidate[0],
        'count': candidate[1].toNumber()
      });
    }
    res.status(200).send(JSON.stringify({
      'status': 'Success',
      'result': candidates
    }))
  } catch (e) {
    res.status(404).send(JSON.stringify({
      'status': 'Error',
      'result': []
    }))
  }
})

/***
 投票
 */
router.post('/vote', function (req, res) {
  var account = req.body.account;
  var candidateName = req.body.candidateName;
  var password = req.body.password;
  var nodeIP = getNodeIP(account);
  node.setProvider(new Web3.providers.HttpProvider(nodeIP));
  var web3 = node.eth.contract(abi).at(address);
  try {
    node.personal.unlockAccount(account, password, 0);
  } catch (e) {
    res.status(401).send(JSON.stringify({
      'status': 'Error',
      'result': 'This account unlock failed.'
    }));
    return;
  }
  if (getCandidateID(candidateName) == null) {
    res.status(404).send(JSON.stringify({
      'status': 'Error',
      'result': 'This candidate is not exist.'
    }))
    return;
  }
  try {
    if (web3.getVoter.call({from: account})[0] == false) {
      var txHash = web3.vote.sendTransaction(getCandidateID(candidateName), candidateName, {from: account});
      var addVoteEvent = web3.Vote();
      addVoteEvent.watch(function(err, result) {
        if (!err && result.transactionHash == txHash) {
          res.status(200).send(JSON.stringify({
            'status': 'Success',
            'result': 'Vote is successful.'
          }))
        } else {
          res.status(404).send(JSON.stringify({
            'status': 'Error',
            'result': ''
          }))
        }
        addVoteEvent.stopWatching();
      })
    } else {
      res.status(409).send(JSON.stringify({
        'status': 'Error',
        'result': 'This account has been voted.'
      }))
    }
  } catch (e) {
    res.status(404).send(JSON.stringify({
      'status': 'Error',
      'result': 'This account insufficient funds.'
    }))
  }
})

module.exports = router;
