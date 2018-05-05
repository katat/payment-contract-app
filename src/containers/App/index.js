import React, { Component }   from 'react';
import { connect }            from 'react-redux';
import { bindActionCreators } from 'redux';
import injectTapEventPlugin   from 'react-tap-event-plugin';
import MuiThemeProvider       from 'material-ui/styles/MuiThemeProvider';
import muiTheme               from './styles/theme/mui-theme'
import { HashRouter,
         Route,
         Redirect,
         Switch }             from 'react-router-dom';

/* 
 * Import global styles into entire app 
 */
import './styles/app.scss';

/* actions */
import * as uiActionCreators  from 'core/actions/actions-ui';

/* application containers & components */
import HomeView       from 'containers/HomeView';

injectTapEventPlugin();

export class App extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <MuiThemeProvider muiTheme={muiTheme}>
        <div>
          <HashRouter>
            <div>
              <div className="container">
                <Switch>
                  <Route path="/home/:contractAddress?" component={HomeView} />
                  <Redirect from="/" to="/home" />
                </Switch>
              </div>
            </div>
          </HashRouter>
        </div>
      </MuiThemeProvider>
    );
  }
}

function mapStateToProps(state) {
  return {
    ui: state.ui
  };
}

function mapDispatchToProps(dispatch) {
  return {
    actions: {
      ui: bindActionCreators(uiActionCreators, dispatch)
    }
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(App);
