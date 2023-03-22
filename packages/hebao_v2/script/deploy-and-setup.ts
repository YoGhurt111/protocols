// run on arbitrum: npx hardhat run --network arbitrum scripts/deploy-and-setup.ts

import BN = require("bn.js");
import hre = require("hardhat");
import RLP from 'rlp'
import fs from "fs";
const ethers = hre.ethers;
import { newWalletImpl, newWalletFactoryContract } from "../test/commons";
import { signCreateWallet } from "../test/helper/signatureUtils";
import { deployWalletImpl, deployWalletFactory } from "./create2-deploy";
import { json } from "hardhat/internal/core/params/argumentTypes";


const gasLimit = 6000000;

async function newWallet(walletFactoryAddress: string, _salt?: number) {

    const ownerAccount = (await ethers.getSigners())[0];
    const ownerAddr = await ownerAccount.getAddress();
    const salt = _salt ? _salt : new Date().getTime();
    const signature = signCreateWallet(
        walletFactoryAddress,
        ownerAddr,
        [],
        new BN(0),
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        new BN(0),
        salt
    );
    const walletConfig: any = {
        owner: ownerAddr,
        guardians: [],
        quota: 0,
        inheritor: ethers.constants.AddressZero,
        feeRecipient: ethers.constants.AddressZero,
        feeToken: ethers.constants.AddressZero,
        maxFeeAmount: 0,
        salt,
        signature: Buffer.from(signature.txSignature.slice(2), "hex")
    };

    const walletFactory = await (await ethers.getContractFactory(
        "WalletFactory"
    )).attach(walletFactoryAddress);

    const walletAddrComputed = await walletFactory.computeWalletAddress(
        ownerAddr,
        salt
    );
    console.log("walletAddrcomputed:", walletAddrComputed);

    const tx = await walletFactory.createWallet(walletConfig, 0, { gasLimit });
    // console.log("tx:", tx);
    const receipt = await tx.wait();
    console.log("receipt:", receipt);

    return walletAddrComputed;
}

async function newWalletFactory(owner: string) {
    const ERC1271Lib = await (await ethers.getContractFactory(
        "ERC1271Lib"
    )).deploy({ gasLimit: gasLimit });
    console.log("const ERC1271Lib = \"", ERC1271Lib.address, "\";");

    const ERC20Lib = await (await ethers.getContractFactory("ERC20Lib")).deploy({ gasLimit });
    console.log("const ERC20Lib = \"", ERC20Lib.address, "\";");

    const GuardianLib = await (await ethers.getContractFactory(
        "GuardianLib"
    )).deploy({ gasLimit });
    console.log("const GuardianLib = \"", GuardianLib.address, "\";");

    const InheritanceLib = await (await ethers.getContractFactory(
        "InheritanceLib"
    )).deploy({ gasLimit });
    console.log("const InheritanceLib = \"", InheritanceLib.address, "\";");

    const LockLib = await (await ethers.getContractFactory("LockLib", {
        libraries: {
            GuardianLib: GuardianLib.address
        }
    })).deploy({ gasLimit });
    console.log("const LockLib = \"", LockLib.address, "\";");

    const MetaTxLib = await (await ethers.getContractFactory("MetaTxLib", {
        libraries: {
            ERC20Lib: ERC20Lib.address
        }
    })).deploy({ gasLimit });
    console.log("const MetaTxLib = \"", MetaTxLib.address, "\";");

    const QuotaLib = await (await ethers.getContractFactory("QuotaLib")).deploy({ gasLimit });
    console.log("const QuotaLib = \"", QuotaLib.address, "\";");

    const RecoverLib = await (await ethers.getContractFactory("RecoverLib", {
        libraries: {
            GuardianLib: GuardianLib.address
        }
    })).deploy({ gasLimit });
    console.log("const RecoverLib = \"", RecoverLib.address, "\";");

    const UpgradeLib = await (await ethers.getContractFactory(
        "UpgradeLib"
    )).deploy({ gasLimit });
    console.log("const UpgradeLib = \"", UpgradeLib.address, "\";");

    const WhitelistLib = await (await ethers.getContractFactory(
        "WhitelistLib"
    )).deploy({ gasLimit });
    console.log("const WhitelistLib = \"", WhitelistLib.address, "\";");

    // goerli
    const ownerSetter = owner;
    const priceOracle = "0x" + "00".repeat(20);

    // mainnet
    // const ownerSetter = "0x86B1cDc04F51a955512115FBc21Cc4AA912Ebb63";
    // const priceOracle = "0xb124190942976431d8181fbe183e44584253da68";

    const smartWallet = await (await ethers.getContractFactory("SmartWallet", {
        libraries: {
            ERC1271Lib: ERC1271Lib.address,
            // ERC1271Lib: "0xb1Bc5955AF5E733aE507c22ea46c2d0982091005",
            ERC20Lib: ERC20Lib.address,
            GuardianLib: GuardianLib.address,
            // GuardianLib: "0xB1983B05A8E6CC8D7d4898A50ea21516227CA427",
            InheritanceLib: InheritanceLib.address,
            // InheritanceLib: "0x0a77AD467BBf9803fbF9228C56e31a9EC64A1d7e",
            LockLib: LockLib.address,
            // LockLib: "0x295C5922051cEC70D19c8c50878165DEB628C1FA",
            MetaTxLib: MetaTxLib.address,
            // MetaTxLib: "0xE64D2E6d65833E1c94144e55eC56f1aaAC766cEE",
            QuotaLib: QuotaLib.address,
            // QuotaLib: "0x56F7be8dfB011697Df6Cea49d0726B653e04b5E3",
            RecoverLib: RecoverLib.address,
            // RecoverLib: "0x2e530AF33a42Beccc3986a660c4D4cDA7Fbcba43",
            UpgradeLib: UpgradeLib.address,
            // UpgradeLib: "0x191670B3EEd12e6cc9a36B38Fe288dd0703Cd075",
            WhitelistLib: WhitelistLib.address
            // WhitelistLib: "0x2f3AE8c7FA985d0c9CbD2dbA16a48C86C963D472"
        }
    })).deploy(priceOracle, ownerSetter, { gasLimit });
    console.log("const SmartWallet = \"", smartWallet.address, "\";");

    const implementationManager = await (await ethers.getContractFactory(
        "DelayedImplementationManager"
    )).deploy(smartWallet.address, { gasLimit });
    console.log("const DelayedImplementationManager = \"", implementationManager.address, "\";");

    const forwardProxy = await (await ethers.getContractFactory(
        "ForwardProxy"
    )).deploy(implementationManager.address, { gasLimit });
    console.log("const ForwardProxy = \"", forwardProxy.address, "\";");

    // const WalletFactory = await (await ethers.getContractFactory(
    //     "WalletFactory"
    // )).deploy(smartWallet.address, { gasLimit });
    const WalletFactory = await (await ethers.getContractFactory(
        "WalletFactory"
    )).deploy(forwardProxy.address, { gasLimit });
    console.log("const WalletFactory = \"", WalletFactory.address, "\";");
    console.log("masterCopy:", smartWallet.address);


    // return "0xC67107500077787edA336EE4A4C3146fd10B27fc";
    return await WalletFactory.deployed();
}

async function verifyWalletFactory() {
    const ownerAddr = "0xd54f3bDe60B73614905BA3881954d9FeB2476360";
    const ERC1271Lib = "0x847bB6809Ab8762f915c0Fb2f54cfc87693514bE";
    const ERC20Lib = "0x419cEE7e96918C40387C350999eB79acd4a33814";
    const GuardianLib = "0xF0058F9C31C9A2B0A3Ca08175bE2C05746F8F85F";
    const InheritanceLib = "0x022E5E2264620fF64C169B3B4a0b6B834AE3a3BA";
    const LockLib = "0xa060931b7d91C991224C2D91827ABC4DE057324F";
    const MetaTxLib = "0xBcc5a4E874ee90B91D5BF43363307C26b08e3ff7";
    const QuotaLib = "0x720961DaB819354Fbd04E9Edc8Fe33843560D9e0";
    const RecoverLib = "0x41F9a54faD387f5B1B8142bb544044b82A174429";
    const UpgradeLib = "0x69B198eDE31636Cbf8839C08625855EDad7AcEB9";
    const WhitelistLib = "0x6eCf01Df2f7cf177b7fBd552Dc1B5489e60FFA01";
    const SmartWallet = "0xEE41641603D5a1D6CF0947d2cF69e691Ba4Acc49";
    const DelayedImplementationManager = "0x8a05A8D328bE51826a9f955b58a9B3B6E7Ee9639";
    const ForwardProxy = "0x65B024f6C32AD06B346c66D67170Dd895D34e5AF";
    const WalletFactory = "0xF5Fa304dc2eE83162f41dFdFaEC56933F1dE3C49";

    // goerli
    const ownerSetter = ownerAddr;
    const priceOracle = "0x" + "00".repeat(20);

    // mainnet
    // const ownerSetter = "0x86B1cDc04F51a955512115FBc21Cc4AA912Ebb63";
    // const priceOracle = "0xb124190942976431d8181fbe183e44584253da68";

    await hre.run("verify:verify", {
        address: ERC1271Lib
    });

    await hre.run("verify:verify", {
        address: ERC20Lib
    });

    await hre.run("verify:verify", {
        address: GuardianLib
    });

    await hre.run("verify:verify", {
        address: InheritanceLib
    });

    await hre.run("verify:verify", {
        address: LockLib,
        libraries: {
            GuardianLib: GuardianLib
        }
    });

    await hre.run("verify:verify", {
        address: MetaTxLib,
        libraries: {
            ERC20Lib: ERC20Lib
        }
    });

    await hre.run("verify:verify", {
        address: QuotaLib
    });

    await hre.run("verify:verify", {
        address: RecoverLib,
        libraries: {
            GuardianLib: GuardianLib
        }
    });

    await hre.run("verify:verify", {
        address: UpgradeLib
    });

    await hre.run("verify:verify", {
        address: WhitelistLib
    });

    await hre.run("verify:verify", {
        address: SmartWallet,
        constructorArguments: [
            priceOracle,
            ownerSetter
        ],
        libraries: {
            ERC1271Lib: ERC1271Lib,
            ERC20Lib: ERC20Lib,
            GuardianLib: GuardianLib,
            InheritanceLib: InheritanceLib,
            LockLib: LockLib,
            MetaTxLib: MetaTxLib,
            QuotaLib: QuotaLib,
            RecoverLib: RecoverLib,
            UpgradeLib: UpgradeLib,
            WhitelistLib: WhitelistLib
        }
    });

    await hre.run("verify:verify", {
        address: DelayedImplementationManager,
        constructorArguments: [
            SmartWallet
        ]
    });

    await hre.run("verify:verify", {
        address: ForwardProxy,
        constructorArguments: [
            DelayedImplementationManager
        ]
    });

    await hre.run("verify:verify", {
        address: WalletFactory,
        // address: "0xC67107500077787edA336EE4A4C3146fd10B27fc",
        constructorArguments: [
            ForwardProxy
        ]
    });
    // await hre.run("verify:verify", {
    //     address: WalletFactory,
    //     constructorArguments: [
    //         SmartWallet
    //     ]
    // });
}

async function addManager(contractAddr: string, manager: string) {
    const managableContract = await (await ethers.getContractFactory(
        "OwnerManagable"
    )).attach(contractAddr);
    await managableContract.addManager(manager);

    const isManager = await managableContract.isManager(manager);
    console.log("isManager:", isManager);
}

async function deployPriceOracle() {
    const proxy = await (await ethers.getContractFactory(
        "OwnedUpgradeabilityProxy"
    )).deploy({ gasLimit });
    console.log("priceOracle proxy address:", proxy.address);
}

// [20210729] deployed at arbitrum testnet: 0xd5535729714618E57C42a072B8d56E72517f3800 (proxy)
async function deployOfficialGuardian() {
    const ownerAccount = (await ethers.getSigners())[0];
    const ownerAddr = await ownerAccount.getAddress();

    const proxy = await (await ethers.getContractFactory(
        "OwnedUpgradeabilityProxy"
    )).deploy({ gasLimit });
    console.log("officialGuardian proxy address:", proxy.address);

    const officialGuardian = await (await ethers.getContractFactory(
        "OfficialGuardian"
    )).deploy({ gasLimit });
    console.log("officialGuardian address:", officialGuardian.address);

    await proxy.upgradeTo(officialGuardian.address);
    const proxyAsOfficialGuardian = await (await ethers.getContractFactory(
        "OfficialGuardian"
    )).attach(proxy.address);

    console.log("initOwner...");
    await proxyAsOfficialGuardian.initOwner(ownerAddr);
    const manager = "0xf6c53560e79857ce12dde54782d487b743b70717"
    await proxyAsOfficialGuardian.addManager(manager);
    await proxyAsOfficialGuardian.addManager("0xC68B42a812569ab9458bde0af0F8C25A928E778f");
    console.log("add", manager, "as a manager");

    return proxy.address;
}

async function getWalletImplAddr(walletFactoryAddress: string) {
    const walletFactory = await (await ethers.getContractFactory(
        "WalletFactory"
    )).attach(walletFactoryAddress);

    const masterCopy = await walletFactory.walletImplementation();
    console.log("masterCopy:", masterCopy);
}

async function walletCreationTest() {
    const ownerAccount = (await ethers.getSigners())[0];
    const ownerAddr = await ownerAccount.getAddress();

    console.log("const ownerAddr = \"", ownerAddr, "\";");
    const walletFactory = await newWalletFactory(ownerAddr);

    // await newWallet(walletFactory.address);

    // await getWalletImplAddr(walletFactory.address);
    const officialGuardianAddr = await deployOfficialGuardian();
    // await addManager(officialGuardianAddr, ownerAddr);
}

async function create2Test() {
    const smartWalletAddr = await deployWalletImpl();
    // // const walletFactoryAddr = await deployWalletFactory(smartWalletAddr);
    // const walletFactoryAddr = "0x5621a77f8EbC9265A60b0E83B49db998aC046B9C";
    // const newWalletAddr = await newWallet(walletFactoryAddr, 1629366091004);

    // console.log("newWalletAddr:", newWalletAddr);
}

async function rlpEncode() {
    const input = JSON.parse(fs.readFileSync("script/data/input.json", "ascii"));
    const str = JSON.stringify(input);
    const buf = Buffer.from(str);
    const length = RLP.encode(buf).byteLength;
    console.log("input length: ", length);
}


async function main() {
    try {
        // await deployPriceOracle();
        // await walletCreationTest();
        // await verifyWalletFactory();
        // await create2Test();
        // await rlpEncode();
        // await deployOfficialGuardian();
        await addManager("0x598C0662718526e2Fc6cE681b10236A61a2A4b38", "0xd15953bd7cbcb36b69d4b9961b56f59cc2553d2e");
    } catch (e) {
        console.log(e.message);
        throw e;
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
