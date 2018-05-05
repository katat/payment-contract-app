import { combineReducers } from 'redux';
import { uiReducer }       from 'core/reducers/reducer-ui';
import { web3Reducer }     from 'core/reducers/web3';

const rootReducer = combineReducers({
  ui: uiReducer,
  api: web3Reducer
});

export default rootReducer;
