import { ethers } from 'ethers';
import tldAbi from '../../abi/PunkTLD.json';
import MinterAbi from "../../abi/Minter.json";
import useChainHelpers from "../../hooks/useChainHelpers";

const { getFallbackProvider } = useChainHelpers();

export default {
  namespaced: true,
  
  state: () => ({ 
    discountPercentage: 0,
    tldName: ".twbtest",
    tldAddress: "0xEEAEED736cc6A6e68CC2F62be19Cf7E06ad9E94A", // TODO
    tldContract: null,
    tldChainId: 421611,
    tldChainName: "Arbitrum Testnet",
    minterAddress: "0x6b5E4D2Bc94F356B3557AaEc35422d21FdcA66c9", // TODO
    minterContract: null,
    minterPaused: true,
    minterTldPrice: null
  }),

  getters: { 
    getMinterDiscountPercentage(state) {
      return state.discountPercentage;
    },
    getTldAddress(state) {
      return state.tldAddress;
    },
    getTldContract(state) {
      return state.tldContract;
    },
    getTldChainId(state) {
      return state.tldChainId;
    },
    getTldChainName(state) {
      return state.tldChainName;
    },
    getTldName(state) {
      return state.tldName;
    },
    getMinterAddress(state) {
      return state.minterAddress;
    },
    getMinterContract(state) {
      return state.minterContract;
    },
    getMinterPaused(state) {
      return state.minterPaused;
    },
    getMinterTldPrice(state) {
      return state.minterTldPrice;
    }
  },

  mutations: {
    setTldContract(state) {
      let fProvider = getFallbackProvider(state.tldChainId);

      const tldIntfc = new ethers.utils.Interface(tldAbi);
      state.tldContract = new ethers.Contract(state.tldAddress, tldIntfc, fProvider);
    },

    setMinterContract(state, contract) {
      state.minterContract = contract;
    },

    setDiscountPercentage(state, percentage) {
      state.discountPercentage = percentage;
    },

    setMinterPaused(state, paused) {
      state.minterPaused = paused;
    },

    setMinterTldPrice(state, price) {
      state.minterTldPrice = price;
    },
  },

  actions: {
    async fetchMinterContractData({commit, state}) {
      let fProvider = getFallbackProvider(state.tldChainId);

      // TLD contract
      const minterIntfc = new ethers.utils.Interface(MinterAbi);
      const minterContract = new ethers.Contract(state.minterAddress, minterIntfc, fProvider);

      // check if TLD contract is paused
      const paused = await minterContract.paused();
      commit("setMinterPaused", paused);

      // TLD contract
      const tldIntfc = new ethers.utils.Interface(tldAbi);
      const contract = new ethers.Contract(state.tldAddress, tldIntfc, fProvider);

      // get price
      const priceWei = await contract.price();
      const domainPrice = ethers.utils.formatEther(priceWei);
      commit("setMinterTldPrice", domainPrice);

    }
  }
};