import { ethers } from 'ethers';
import { useEthers, displayEther, shortenAddress } from 'vue-dapp';
import erc721Abi from '../../abi/Erc721.json';

const { address, balance, chainId, signer } = useEthers();

export default {
  namespaced: true,
  
  state: () => ({ 
    canUserBuy: false,
    discountEligible: false,
    nftAddress: "0xe9A1a323b4c8FD5Ce6842edaa0cd8af943cBdf22",
    selectedName: null, // domain name that appears as the main profile name
    selectedNameData: null,
    selectedNameImageSvg: null,
    selectedNameKey: null,
    tokenAddress: "",
    tokenContract: null,
    tokenAllowance: 0, // user's allowance for wrapper contract
    tokenBalance: 0, // user's balance
    tokenName: "ETH",
    tokenDecimals: 4,
    userAddress: null,
    userAllDomainNames: [], // all domain names of current user (default + manually added)
    userDomainNamesKey: null,
    userShortAddress: null,
    userBalanceWei: 0, // ETH balance in wei
    userBalance: 0 // ETH balance
  }),

  getters: { 
    getCanUserBuy(state) {
      return state.canUserBuy;
    },
    getDiscountEligible(state) {
      return state.discountEligible;
    },
    getUserAddress(state) {
      return state.userAddress;
    },
    getUserBalance(state) {
      return state.userBalance;
    },
    getUserBalanceWei(state) {
      return state.userBalanceWei;
    },
    getUserAllDomainNames(state) {
      return state.userAllDomainNames;
    },
    getUserSelectedName(state) {
      return state.selectedName;
    },
    getUserSelectedNameData(state) {
      return state.selectedNameData;
    },
    getUserSelectedNameImageSvg(state) {
      return state.selectedNameImageSvg;
    },
    getUserShortAddress(state) {
      return state.userShortAddress;
    },
    getPaymentTokenAddress(state) {
      return state.tokenAddress;
    },
    getPaymentTokenAllowance(state) {
      return state.tokenAllowance;
    },
    getPaymentTokenBalance(state) {
      return state.tokenBalance;
    },
    getPaymentTokenContract(state) {
      return state.tokenContract;
    },
    getPaymentTokenName(state) {
      return state.tokenName;
    },
    getPaymentTokenDecimals(state) {
      return state.tokenDecimals;
    }
  },

  mutations: { 
    addDomainManually(state, domainName) {
      let userDomainNames = [];

      if (address.value) {
        state.userDomainNamesKey = "userDomainNames" + String(chainId.value) + String(shortenAddress(address.value));
        state.selectedNameKey = "selectedName" + String(chainId.value) + String(shortenAddress(address.value));

        if (localStorage.getItem(state.userDomainNamesKey)) {
          userDomainNames = JSON.parse(localStorage.getItem(state.userDomainNamesKey));
        }

        if (!userDomainNames.includes(domainName)) {
          userDomainNames.push(domainName);
        }

        for (let udName of userDomainNames) {
          if (!state.userAllDomainNames.includes(udName)) {
            state.userAllDomainNames.push(udName);
          }
        }

        localStorage.setItem(state.userDomainNamesKey, JSON.stringify(userDomainNames));
      }
      
    },

    setUserData(state) {
      state.userAddress = address.value;
      state.userShortAddress = shortenAddress(address.value);
      state.userBalanceWei = balance.value;
      state.userBalance = displayEther(balance.value);
    },

    setCanUserBuy(state, canBuy) {
      state.canUserBuy = canBuy;
    },

    setCanGetDiscount(state, eligible) {
      state.discountEligible = eligible;
    },

    setDefaultName(state, defName) {
      if (!state.userAllDomainNames.includes(defName)) {
        state.userAllDomainNames.push(defName);
      }
    },

    setSelectedName(state, selectedName) {
      state.selectedName = selectedName;
      localStorage.setItem(state.selectedNameKey, state.selectedName);
      localStorage.setItem("connected", "metamask");
    },

    setSelectedNameKey(state, selectedNameKey) {
      state.selectedNameKey = selectedNameKey;
    },

    setSelectedNameData(state, nameData) {
      state.selectedNameData = nameData;
    },

    setSelectedNameImageSvg(state, imageSvg) {
      state.selectedNameImageSvg = imageSvg;
    },

    setUserDomainNamesKey(state, key) {
      state.userDomainNamesKey = key;
    },

    setPaymentTokenAllowance(state, allowance) {
      state.tokenAllowance = allowance;
    },

    setPaymentTokenBalance(state, balance) {
      state.tokenBalance = balance;
    },

    setPaymentTokenContract(state, contract) {
      state.tokenContract = contract;
    },

    setUserAllDomainNames(state, domains) {
      state.userAllDomainNames = domains;
    }
  },

  actions: { 
    async fetchUserDomainNames({ dispatch, commit, state, rootState, rootGetters }, newAccount) {
      let userDomainNames = [];
      let userDomainNamesKey = null;
      let selectedNameKey = null;

      if (address.value) {
        dispatch("fetchCanUserBuy");

        userDomainNamesKey = "userDomainNames" + String(chainId.value) + String(shortenAddress(address.value));
        selectedNameKey = "selectedName" + String(chainId.value) + String(shortenAddress(address.value));

        commit("setSelectedNameKey", selectedNameKey);
        commit("setUserDomainNamesKey", userDomainNamesKey);

        // reset user data in case there's a switch between accounts
        if (newAccount) {
          if (localStorage.getItem(selectedNameKey) && localStorage.getItem(selectedNameKey) !== String(null)) {
            commit('setSelectedName', localStorage.getItem(selectedNameKey));
          } else {
            commit('setSelectedName', null);
            commit("setSelectedNameData", null);
            commit("setSelectedNameImageSvg", null);
          }

          commit("setUserAllDomainNames", []);
        }
      
        if (localStorage.getItem(userDomainNamesKey)) {
          userDomainNames = JSON.parse(localStorage.getItem(userDomainNamesKey));
        }

        for (let udName of userDomainNames) {
          commit('setDefaultName', udName);
        }
      
        // fetch user's default name
        const intfc = new ethers.utils.Interface(rootGetters["punk/getTldAbi"]);
        const contract = new ethers.Contract(rootGetters["tld/getTldAddress"], intfc, signer.value);

        const userDefaultName = await contract.defaultNames(address.value);

        if (userDefaultName) {
          commit('setDefaultName', userDefaultName + rootState.tld.tldName);

          if (!userDomainNames.includes(userDefaultName + rootState.tld.tldName)) {
            userDomainNames.push(userDefaultName + rootState.tld.tldName);
          }

          if (!state.selectedName) {
            commit('setSelectedName', userDefaultName + rootState.tld.tldName);
          }
        }

        if (localStorage.getItem(selectedNameKey) && localStorage.getItem(selectedNameKey) !== String(null)) {
          commit('setSelectedName', localStorage.getItem(selectedNameKey));
        } else {
          localStorage.setItem(selectedNameKey, state.selectedName);
        }

        localStorage.setItem(userDomainNamesKey, JSON.stringify(userDomainNames));
        
        dispatch("fetchSelectedNameData");
      }
    },

    async fetchCanUserBuy({ commit, state }) {
      if (address.value) {
        // fetch if user can buy a domain
        const intfc = new ethers.utils.Interface(erc721Abi);
        const contract = new ethers.Contract(state.nftAddress, intfc, signer.value);

        const balance = await contract.balanceOf(address.value);

        if (Number(balance) > 0) {
          commit("setCanUserBuy", true);
        }
      }
    },

    // fetch selectedName data (image etc.)
    async fetchSelectedNameData({commit, state, rootGetters}) {

      if (state.selectedName) {
        const nameArr = state.selectedName.split(".");
        const name = nameArr[0];
        
        if (name) {
          const intfc = new ethers.utils.Interface(rootGetters["punk/getTldAbi"]);
          const contract = new ethers.Contract(rootGetters["tld/getTldAddress"], intfc, signer.value);

          const nameData = await contract.domains(name);

          commit("setSelectedNameData", nameData);

          // get contract image for that token ID
          let metadata = await contract.tokenURI(nameData.tokenId);
          let imgFound = false;

          if (nameData.data) {
            const customData = JSON.parse(nameData.data);
          
            if (customData.imgAddress) {
              if (!customData.imgAddress.startsWith("0x")) {
                commit("setSelectedNameImageSvg", customData.imgAddress.replace("ipfs://", "https://ipfs.io/ipfs/"));
                imgFound = true;
              } else if (customData.imgAddress) {
                // fetch image URL of that PFP
                const pfpInterface = new ethers.utils.Interface([
                  "function tokenURI(uint256 tokenId) public view returns (string memory)"
                ]);
                const pfpContract = new ethers.Contract(customData.imgAddress, pfpInterface, signer.value);
                metadata = await pfpContract.tokenURI(customData.imgTokenId);
              }
            }

            if (metadata.includes("ipfs://")) {
              metadata = metadata.replace("ipfs://", "https://ipfs.io/ipfs/");
            } 
            
            if (metadata.includes("http")) {
              const response = await fetch(metadata);
              const result = await response.json();

              if (result && result.image) {
                commit("setSelectedNameImageSvg", result.image.replace("ipfs://", "https://ipfs.io/ipfs/"));
                imgFound = true;
              } else {
                commit("setSelectedNameImageSvg", null);
              }
            }
          }

          if (metadata && !imgFound) {
            const json = atob(metadata.substring(29));
            const result = JSON.parse(json);

            if (result && result.image) {
              commit("setSelectedNameImageSvg", result.image);
            } else {
              commit("setSelectedNameImageSvg", null);
            }
          }
        }
      }
      
    },

    async removeDomainFromUserDomains({commit, state}, domainName) {
      if (chainId.value) {
        if (localStorage.getItem(state.userDomainNamesKey)) {
          const userDomainNames = JSON.parse(localStorage.getItem(state.userDomainNamesKey));
          state.userAllDomainNames = [];

          let newDomainNamesArray = [];
          for (let udName of userDomainNames) {
            if (udName != domainName) {
              newDomainNamesArray.push(udName);
              state.userAllDomainNames.push(udName);
            }
          }

          localStorage.setItem(state.userDomainNamesKey, JSON.stringify(newDomainNamesArray));

          // if the removed domain name is currently marked as selected name, replace it with another or null
          if (localStorage.getItem(state.selectedNameKey) && localStorage.getItem(state.selectedNameKey)==domainName) {
            if (newDomainNamesArray.length > 0) {
              commit('setSelectedName', newDomainNamesArray[0]);
            }
            commit('setSelectedName', null);
          }
        }
  
        
      }
    }
  }

};