<template>
  <div class="container text-center home-gradient ">
    <div class="text-align-header">
      <h1>Mint your {{getTldName}} domain!</h1>
    </div>


    <div class="d-flex justify-content-center domain-input-container mb-3 mt-5">
      <div class="input-group domain-input input-group-lg input-sizing">
        <input
          v-model="chosenDomainName" 
          placeholder="enter domain name"
          type="text" 
          class="form-control"
          aria-label="Text input with dropdown button"
        >

        <span class="input-group-text tld-addon">
          <span v-if="loading" class="spinner-border spinner-border-sm mx-1" role="status" aria-hidden="true"></span>
          <span style="color:#1B0D23;">{{getTldName}}</span>
        </span>
      </div>
    </div>

    <p class="error">
      <small v-if="buyNotValid(chosenDomainName).invalid">
        <em>{{ buyNotValid(chosenDomainName).message }}</em>
      </small>
    </p>

    <div class="text-align-header">
      <p class="mt-5 price-text">
          Domain price: {{getPriceWithDiscount}} {{getPaymentTokenName}}
      </p>
    </div>

    <!-- Wrapper contract paused -->
    <button v-if="isActivated && getMinterPaused" class="btn btn-primary btn-lg mt-3 buy-button" :disabled="true">
      <span v-if="getMinterPaused">Buying paused</span>
    </button>

    <!-- Too low token balance -->
    <button v-if="isActivated && isNetworkSupported && !getMinterPaused && !getCanUserBuy" class="btn btn-primary btn-lg mt-3 buy-button" @click="approveToken" :disabled="waiting || buyNotValid(chosenDomainName).invalid || !hasUserEnoughTokens">
      <span>Not eligible</span>
    </button>

    <!-- Too low token balance -->
    <button v-if="isActivated && isNetworkSupported && !getMinterPaused && !hasUserEnoughTokens && getCanUserBuy" class="btn btn-primary btn-lg mt-3 buy-button" @click="approveToken" :disabled="waiting || buyNotValid(chosenDomainName).invalid || !hasUserEnoughTokens">
      <span>Your {{getPaymentTokenName}} balance is too low</span>
    </button>

    <!-- Approve token -->
    <button data-bs-toggle="modal" data-bs-target="#approveTokenModal" v-if="isActivated && getCanUserBuy && isNetworkSupported && !getMinterPaused && !hasEnoughTokenAllowance && hasUserEnoughTokens" class="btn btn-primary btn-lg mt-3 buy-button" :disabled="waiting || buyNotValid(chosenDomainName).invalid || !hasUserEnoughTokens">
      <span v-if="waiting" class="spinner-border spinner-border-sm mx-1" role="status" aria-hidden="true"></span>
      <span>Approve {{getPaymentTokenName}}</span>
    </button>

    <p v-if="isActivated && isNetworkSupported && !getMinterPaused && getCanUserBuy && !hasEnoughTokenAllowance && hasUserEnoughTokens" class="mt-1">
      <small><strong>Important:</strong> You will need to complete 2 transactions: Approve {{getPaymentTokenName}} + Buy Domain.</small>
    </p>

    <!-- Buy domain -->
    <button v-if="isActivated && isNetworkSupported && getCanUserBuy && !getMinterPaused && hasEnoughTokenAllowance && hasUserEnoughTokens" class="btn btn-primary btn-lg mt-3 buy-button" @click="buyDomain" :disabled="waiting || buyNotValid(chosenDomainName).invalid || !hasUserEnoughTokens">
      <span v-if="waiting" class="spinner-border spinner-border-sm mx-1" role="status" aria-hidden="true"></span>
      <span>Buy domain</span>
    </button>

    <!-- Connect Wallet -->
    <button v-if="!isActivated" class="btn btn-primary btn-lg mt-3 btn-Disconnected" @click="open">Connect wallet</button>

    <div v-if="isActivated && !isNetworkSupported" class="mt-4">
      <button class="btn btn-primary btn-lg btn-Disconnected" @click="changeNetwork('Arbitrum')">Switch to Arbitrum</button>
    </div>
    
  </div>

  <Referral v-if="isActivated" />

  <!-- Approve token Modal -->
  <div class="modal fade" id="approveTokenModal" tabindex="-1" aria-labelledby="approveTokenModalLabel" aria-hidden="true" modal-dialog-centered>
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="approveTokenModalLabel">Approve {{getPaymentTokenName}}</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <p>
              If you plan to mint multiple domains, consider giving the minting contract a higher {{getPaymentTokenName}} approval. 
              With each domain buy, the total approval amount is reduced by {{getPriceWithDiscount}} {{getPaymentTokenName}}. (Worry not, 
              redundant approval amount can later be reduced to 0.)
            </p>

            Approval for <input type="text" id="recipient-name" v-model="chosenAllowance"> {{getPaymentTokenName}}.
          </div>
        </div>
        <div class="modal-footer">
          <button 
            type="button" 
            @click="approveToken" 
            class="btn btn-secondary"
            :disabled="selectedAllowanceTooLow" 
            >
              <span v-if="!selectedAllowanceTooLow">Approve {{getPaymentTokenName}}</span>
              <span v-if="selectedAllowanceTooLow">Approval lower than domain price</span>
            </button>

          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ethers } from 'ethers';
import { useBoard, useEthers } from 'vue-dapp';
import { mapActions, mapGetters, mapMutations } from 'vuex';
import { useToast, TYPE } from "vue-toastification";
import WaitingToast from "../components/toasts/WaitingToast.vue";
import Referral from '../components/Referral.vue';
import useDomainHelpers from "../hooks/useDomainHelpers";
import useChainHelpers from "../hooks/useChainHelpers";
import MinterAbi from "../abi/Minter.json";
import erc20Abi from '../abi/Erc20.json';

export default {
  name: "Home",

  data() {
    return {
      chosenDomainName: null,
      chosenAllowance: null,
      loading: false, // loading data
      waiting: false, // waiting for TX to complete
      minterContract: null
    }
  },

  components: {
    Referral
  },

  created() {
    this.chosenAllowance = this.getPriceWithDiscount;
  },

  computed: {
    ...mapGetters("user", ["getPaymentTokenAddress", "getPaymentTokenName", "getPaymentTokenAllowance", "getPaymentTokenBalance", "getCanUserBuy", "getDiscountEligible"]),
    ...mapGetters("network", ["getBlockExplorerBaseUrl"]),
    ...mapGetters("tld", ["getMinterAddress", "getTldContract", "getMinterTldPrice", "getMinterPaused", "getMinterDiscountPercentage", "getTldName"]),

    getPriceWithDiscount() {
      if (this.getMinterDiscountPercentage > 0 && this.getDiscountEligible) {
        // if user is eligible for a discount, show the discounted price
        const perc = Number(this.getMinterDiscountPercentage) / 100;
        return (Number(this.getMinterTldPrice) - (Number(this.getMinterTldPrice)*perc));
      }

      return this.getMinterTldPrice;
    },

    selectedAllowanceTooLow() {
      if (Number(this.chosenAllowance) >= Number(this.getPriceWithDiscount)) {
        return false;
      }

      return true;
    },

    domainLowerCase() {
      return this.chosenDomainName.toLowerCase();
    },

    hasEnoughTokenAllowance() {
      if (this.address && Number(this.getPriceWithDiscount) > 0 && Number(this.getPaymentTokenBalance) > 0) {
        if (Number(this.getPaymentTokenAllowance) >= Number(this.getPriceWithDiscount)) {
          return true;
        }
      }

      return false;
    },

    hasUserEnoughTokens() {
      if (this.address && Number(this.getPriceWithDiscount) > 0 && Number(this.getPaymentTokenBalance) > 0) {
        if (Number(this.getPaymentTokenBalance) >= Number(this.getPriceWithDiscount)) {
          return true;
        }
      }

      return false;
    },

    isNetworkSupported() {
      if (this.isActivated) {
        if (this.chainId === 42161) {
          return true;
        }
      }

      return false;
    }
  },

  methods: {
    ...mapActions("user", ["fetchCanUserBuy", "getPaymentTokenDecimals"]),
    ...mapMutations("user", ["addDomainManually", "setPaymentTokenAllowance"]),

    async approveToken() {
      this.waiting = true;

      // token contract
      const tokenIntfc = new ethers.utils.Interface(erc20Abi);
      const tokenContractSigner = new ethers.Contract(this.getPaymentTokenAddress, tokenIntfc, this.signer);

      try {
        const tx = await tokenContractSigner.approve(
          this.getMinterAddress, // spender (wrapper contract)
          ethers.utils.parseUnits(this.chosenAllowance, this.getPaymentTokenDecimals) // amount
        );

        const toastWait = this.toast(
          {
            component: WaitingToast,
            props: {
              text: "Please wait for your transaction to confirm. Click on this notification to see transaction in the block explorer."
            }
          },
          {
            type: TYPE.INFO,
            onClick: () => window.open(this.getBlockExplorerBaseUrl+"/tx/"+tx.hash, '_blank').focus()
          }
        );

        document.getElementById('approveTokenModal').click(); // close the modal

        const receipt = await tx.wait();

        if (receipt.status === 1) {
          this.toast.dismiss(toastWait);
          this.toast("You have successfully set the allowance! Now proceed with buying the domain.", {
            type: TYPE.SUCCESS,
            onClick: () => window.open(this.getBlockExplorerBaseUrl+"/tx/"+tx.hash, '_blank').focus()
          });
          this.setPaymentTokenAllowance(this.chosenAllowance);
          this.waiting = false;
        } else {
          this.toast.dismiss(toastWait);
          this.toast("Transaction has failed.", {
            type: TYPE.ERROR,
            onClick: () => window.open(this.getBlockExplorerBaseUrl+"/tx/"+tx.hash, '_blank').focus()
          });
          console.log(receipt);
          this.waiting = false;
        }

      } catch (e) {
        console.log(e)
        this.waiting = false;
        this.toast(e.message, {type: TYPE.ERROR});
      }

      this.waiting = false;
    },

    async buyDomain() {
      this.waiting = true;
      const fullDomainName = this.domainLowerCase + this.getTldName;

      // check if domain already minted
      const existingHolder = await this.getTldContract.getDomainHolder(this.domainLowerCase);

      if (existingHolder !== ethers.constants.AddressZero) {
        this.toast("Sorry, but this domain name is already taken...", {type: TYPE.ERROR});
        this.waiting = false;
        return;
      }

      // wrapper contract (with signer)
      const wrapperIntfc = new ethers.utils.Interface(MinterAbi);
      const minterContractSigner = new ethers.Contract(this.getMinterAddress, wrapperIntfc, this.signer);

      try {
        let referral = localStorage.getItem("referral");

        if (!referral || !ethers.utils.isAddress(referral)) {
          referral = ethers.constants.AddressZero;
        }

        const tx = await minterContractSigner.mint(
          this.domainLowerCase,
          this.address,
          referral
        );

        const toastWait = this.toast(
          {
            component: WaitingToast,
            props: {
              text: "Please wait for your transaction to confirm. Click on this notification to see transaction in the block explorer."
            }
          },
          {
            type: TYPE.INFO,
            onClick: () => window.open(this.getBlockExplorerBaseUrl+"/tx/"+tx.hash, '_blank').focus()
          }
        );

        const receipt = await tx.wait();

        if (receipt.status === 1) {
          this.toast.dismiss(toastWait);
          this.toast("You have successfully bought the domain!", {
            type: TYPE.SUCCESS,
            onClick: () => window.open(this.getBlockExplorerBaseUrl+"/tx/"+tx.hash, '_blank').focus()
          });
          this.addDomainManually(fullDomainName);
          this.fetchCanUserBuy();
          this.waiting = false;
        } else {
          this.toast.dismiss(toastWait);
          this.toast("Transaction has failed.", {
            type: TYPE.ERROR,
            onClick: () => window.open(this.getBlockExplorerBaseUrl+"/tx/"+tx.hash, '_blank').focus()
          });
          console.log(receipt);
          this.waiting = false;
        }

      } catch (e) {
        console.log(e)
        this.waiting = false;
        this.toast(e.message, {type: TYPE.ERROR});
      }

      this.waiting = false;
    },

    changeNetwork(networkName) {
      const networkData = this.switchNetwork(networkName); 

      window.ethereum.request({ 
        method: networkData.method, 
        params: networkData.params
      });
    },

  },

  setup() {
    const { open } = useBoard();
    const { address, chainId, isActivated, signer } = useEthers();
    const toast = useToast();
    const { buyNotValid } = useDomainHelpers();
    const { switchNetwork } = useChainHelpers();

    return { address, buyNotValid, chainId, isActivated, open, signer, switchNetwork, toast }
  },

  watch: {
    getMinterTldPrice(newVal, oldVal) {
      this.chosenAllowance = this.getPriceWithDiscount;
    }
  }
}
</script>


<style scoped>
.and {
  font-size: 1.7em;
  vertical-align: bottom;
  padding-left: 0.2em;
  padding-right: 0.1em;
}

.buy-button {
  margin-bottom: 50px;
}

.container {
  padding-top: 80px;
  padding-bottom: 100px;
}

.domain-input {
  width: 50%;
}

.domain-input-container {
  margin-top: 30px;
}

.error {
  color: #DBDFEA;
}

.tld-addon {
  background-color: white;
}

@media only screen and (max-width: 767px) {
  .domain-input {
    width: 100%;
  }
}
</style>