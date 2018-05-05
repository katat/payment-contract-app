import constants from 'core/types';

export function injectWeb3(obj) {
  return {
    type: constants.WEB3_INJECTED,
    value: obj
  };
}

export function injectPayrollContract(obj) {
  return {
    type: constants.PAYROLL_CONTRACT_DEPLOYED,
    value: obj
  };
}

export function loadWeb3Accounts(obj) {
  return {
    type: constants.WEB3_ACCOUNTS_LOADED,
    value: obj
  };
}

export function addEvent(obj) {
  return {
    type: constants.CONTRACT_EVENTS_ADDED,
    value: obj
  };
}

export function updatePayrollCache(key, obj) {
  return {
    type: constants.UPDATE_PAYROLL_CACHE,
    key,
    value: obj
  };
}

export function resetPayrollState() {
  return {
    type: constants.RESET_PAYROLL_STATE
  };
}