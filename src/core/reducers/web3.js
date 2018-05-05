import constants from 'core/types'
import moment from 'moment'

const initialState = {web3 : null, accounts: null, payrollContract: null, events: null, payrollCache: {depositAmount: ''}, stepIndex: 0};
const events = []
let depositAmount = 0, paidAmount = 0

export function web3Reducer(state = initialState, action) {
  let stepIndex = state.stepIndex || 0
  let cacheValue = {}
  cacheValue[action.key] = action.value

  switch (action.type) {

  case constants.WEB3_INJECTED:
    return Object.assign({}, state, {
      web3: action.value
    });
  
  case constants.WEB3_ACCOUNTS_LOADED:
    return Object.assign({}, state, {
      accounts: action.value
    });
  
  case constants.PAYROLL_CONTRACT_DEPLOYED:
    return Object.assign({}, state, {
      payrollContract: action.value,
      stepIndex: 1
    });

  case constants.CONTRACT_EVENTS_ADDED:
    if (action.value.transactionHash === state.payrollCache.confirmTx) {
      state.payrollCache.confirmTx = null
    }
    
    if (action.value.event === '_deposit') {
      stepIndex = 2
      depositAmount += parseFloat(state.web3.fromWei(action.value.args.amount.toNumber(), 'Ether'))
      state.payrollCache.depositAmount = depositAmount
    }
    if (action.value.event === '_handshake') {
      stepIndex = 3
      state.payrollCache.payee = action.value.args.employee
      if (moment().isAfter(state.payrollCache.trialEndDate)) {
        state.payrollCache.passedTrial = true
        stepIndex = 4
      }
    }
    if (action.value.event === '_pay') {
      paidAmount += parseFloat(state.web3.fromWei(action.value.args.amount.toNumber(), 'Ether'))
      state.payrollCache.paidAmount = paidAmount
      if (moment().isAfter(state.payrollCache.contractEndDate)) {
        stepIndex = 5
      }
      if (paidAmount === depositAmount) {
        stepIndex = 6
      }
    }
    if (action.value.event === '_cancelled') {
      state.payrollCache.cancelled = true
    }
    events.push(action.value)
    return Object.assign({}, state, {
      events,
      stepIndex
    });
  
  case constants.UPDATE_PAYROLL_CACHE:
    Object.assign(state.payrollCache, cacheValue);
    if (stepIndex === 0) {
      if (moment(state.payrollCache.contractEndDate).isBefore(new Date())) {
        state.payrollCache.invalidContractTime = true
      } else {
        state.payrollCache.invalidContractTime = false
      }
      if (!state.payrollCache.trialEndDate || 
          moment(state.payrollCache.trialEndDate).isBefore(new Date()) || 
          moment(state.payrollCache.trialEndDate).isAfter(state.payrollCache.contractEndDate)
        ) {
        state.payrollCache.invalidTrialTime = true
      } else {
        state.payrollCache.invalidTrialTime = false
      }
    }
    return Object.assign({}, state);

  case constants.RESET_PAYROLL_STATE:
    initialState.web3 = state.web3
    initialState.accounts = state.accounts
    initialState.payrollCache = {}
    return Object.assign({}, state, initialState);
  
  default:
    return state;
  }
}
