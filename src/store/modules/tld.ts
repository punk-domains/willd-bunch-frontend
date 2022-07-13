import { ethers } from 'ethers';
import tldAbi from '../../abi/PunkTLD.json';
import MinterAbi from "../../abi/Minter.json";
import useChainHelpers from "../../hooks/useChainHelpers";

const { getFallbackProvider } = useChainHelpers();

export default {
  namespaced: true,
  
  state: () => ({ 
    discountPercentage: 0,
    tldName: ".smol",
    tldAddress: "0xE0d972817e94c5FF9BDc49a63d8927A0bA833E4f",
    tldContract: null,
    tldChainId: 42161,
    minterAddress: "0x08114885E510e33995F40f00735FA532a7391024",
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
      let fProvider = getFallbackProvider(state.tldChainId); // Polygon

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
    async fetchMinterContractData({commit, state, rootGetters}) {
      let fProvider = getFallbackProvider(state.tldChainId);

      // Minter contract
      const minterIntfc = new ethers.utils.Interface(MinterAbi);
      const contract = new ethers.Contract(state.minterAddress, minterIntfc, fProvider);

      commit("setMinterContract", contract);

      // check if minter contract is paused
      const paused = await contract.paused();
      commit("setMinterPaused", paused);

      // get price
      const priceWei = await contract.price();
      const domainPrice = ethers.utils.formatUnits(priceWei, rootGetters["user/getPaymentTokenDecimals"]);
      commit("setMinterTldPrice", domainPrice);

      // get discount
      const discountBps = await contract.discountBps();
      const discountPercentage = Number(discountBps) / 100; // %
      commit("setDiscountPercentage", discountPercentage);
      
      //this.chosenAllowance = this.domainPrice;
    }
  }
};