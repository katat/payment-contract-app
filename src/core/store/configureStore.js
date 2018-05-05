import { applyMiddleware, createStore } from 'redux';
import reduxThunk                       from 'redux-thunk';
import createLogger                     from 'redux-logger';
import rootReducer                      from '../reducers';
import Web3                             from 'web3';
import { injectWeb3, loadWeb3Accounts } from 'core/actions/web3';

export default function configureStore(initialState) {
  const logger = createLogger({
    collapsed: true,
    predicate: () =>
    process.env.NODE_ENV === 'development'
  });

  const middleware = applyMiddleware(reduxThunk, logger);

  const store = middleware(createStore)(rootReducer, initialState);

  window.addEventListener('load', function() {
    var web3 = window.web3

    // Checking if Web3 has been injected by the browser (Mist/MetaMask)
    if (typeof web3 !== 'undefined') {
      // Use Mist/MetaMask's provider.
      web3 = new Web3(web3.currentProvider)
      store.dispatch(injectWeb3(web3))
      let account = web3.eth.accounts[0];
      store.dispatch(loadWeb3Accounts(web3.eth.accounts))
      setInterval(function() {
        if (web3.eth.accounts[0] !== account) {
          account = web3.eth.accounts[0]
          store.dispatch(loadWeb3Accounts(web3.eth.accounts))
        }
      }, 100);
    }
  })

  if (module.hot) {
    // Enable Webpack hot module replacement for reducers
    module.hot.accept('../reducers', () => {
      const nextRootReducer = require('../reducers').default;
      store.replaceReducer(nextRootReducer);
    });
  }

  return store;
}
