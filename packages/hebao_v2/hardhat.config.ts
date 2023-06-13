import { HardhatUserConfig } from "hardhat/types";
import { task } from "hardhat/config";

import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "hardhat-gas-reporter";
import "@nomiclabs/hardhat-etherscan";
import * as dotenv from "dotenv";


dotenv.config();

// import "@eth-optimism/plugins/hardhat/compiler";
// import "@eth-optimism/plugins/hardhat/ethers";

task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(await account.address);
  }
});

function loadTestAccounts() {
  const fs = require("fs");
  const accountKeys = JSON.parse(
    fs.readFileSync("./test_account_keys.json", "ascii")
  ).private_keys;
  const accounts = [];
  for (const addr in accountKeys) {
    accounts.push({
      privateKey: accountKeys[addr],
      balance: "1" + "0".repeat(24)
    });
  }
  // console.log(accounts.map(item => item.privateKey));
  // console.log(process.env.PRIV_KEY)
  return accounts;
}

export default {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      accounts: loadTestAccounts()
    },

    optimistic: {
      chainId: 420,
      url: 'http://127.0.0.1:8545',
      gas: 6700000,
      accounts: { mnemonic: 'test test test test test test test test test test test junk' }
    },

    // HttpNetworkConfig
    ganache: {
      chainId: 31337,
      url: "http://localhost:8545",
      gas: "auto",
      gasPrice: "auto",
      gasMultiplier: 1,
      timeout: 20000,
      httpHeaders: undefined,
      accounts: loadTestAccounts().map(item => item.privateKey)
    },

    goerli: {
      chainId: 5,
      // url: "https://goerli.infura.io/v3/b7c22d73c16e4c0ea3f88dadbdffbe03",
      url: "https://eth-goerli.g.alchemy.com/v2/1581DqMoecvtniMx3wC3QRX7vcTX9tdq",
      gas: 8000000,
      gasPrice: 14e9,
      gasMultiplier: 1,
      timeout: 20000,
      httpHeaders: undefined,
      accounts: [process.env.PRIV_KEY]
      // accounts: loadTestAccounts().map(item => item.privateKey)
    },

    taiko: {
      chainId: 167001,
      url: "https://rpc.internal.taiko.xyz",
      gas: 6000000,
      gasPrice: 1e9,
      gasMultiplier: 1,
      timeout: 20000,
      httpHeaders: undefined,
      loggingEnabled: true,
      accounts: [process.env.PRIV_KEY]
      // accounts: loadTestAccounts().map(item => item.privateKey)
    },

    taiko3: {
      chainId: 167005,
      url: "https://rpc.test.taiko.xyz",
      accounts: [process.env.PRIV_KEY],
    },


    mainnet: {
      chainId: 1,
      url: "https://eth-mainnet.g.alchemy.com/v2/qXQjCt36sVRzYRoHk2Si6WhNJIvXKNoj",
      gas: 8000000,
      gasPrice: 15e9,
      gasMultiplier: 1,
      timeout: 20000,
      httpHeaders: undefined,
      accounts: [process.env.PRIV_KEY]
      // accounts: loadTestAccounts().map(item => item.privateKey)
    },

    bsctestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      gasPrice: 20000000000,
      accounts: loadTestAccounts().map(item => item.privateKey)
    },

    arbitrum_test: {
      chainId: 421611,
      url: "https://rinkeby.arbitrum.io/rpc",
      gas: "auto",
      gasPrice: "auto",
      gasMultiplier: 1,
      timeout: 60000,
      httpHeaders: undefined,
      accounts: loadTestAccounts()
        .map(item => item.privateKey)
        .slice()
    },

    arbitrum_one: {
      chainId: 42161,
      url: "https://arb1.arbitrum.io/rpc",
      gas: "auto",
      gasPrice: "auto",
      gasMultiplier: 1,
      timeout: 20000,
      httpHeaders: undefined,
      accounts: []
    }
  },

  solidity: {
    compilers: [
      {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 100000
          }
        }
      },
      // {
      //   version: "0.8.2",
      //   settings: {
      //     optimizer: {
      //       enabled: true,
      //       runs: 100000
      //     }
      //   }
      // }
    ]

  },

  gasReporter: {
    currency: "USD",
    gasPrice: 100
  },

  etherscan: {
    // Your API key for Etherscan
    apiKey: "1F73WEV5ZM2HKPIVCG65U5QQ427NPUG9FI",
    customChains: [
      {
        network: 'mainnet',
        chainId: 1,
        urls: {
          apiURL: 'http://api.etherscan.io/api',  // https => http
          browserURL: 'https://etherscan.io',
        },
      },
      {
        network: 'goerli',
        chainId: 5,
        urls: {
          apiURL: 'http://api-goerli.etherscan.io/api',  // https => http
          browserURL: 'https://goerli.etherscan.io',
        },
      },
      {
        network: 'taiko',
        chainId: 167001,
        urls: {
          apiURL: 'https://explorer.internal.taiko.xyz/api',  // https => http
          browserURL: 'https://explorer.internal.taiko.xyz',
        },
      },
      {
        network: 'taiko3',
        chainId: 167005,
        urls: {
          apiURL: 'https://explorer.test.taiko.xyz/api',  // https => http
          browserURL: 'https://explorer.test.taiko.xyz',
        },
      }
    ]
  }
};
