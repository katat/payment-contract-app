import React, { Component }   from 'react'
import { connect }            from 'react-redux';
import { bindActionCreators } from 'redux';
import { withRouter }         from 'react-router-dom';
import { Redirect }         from 'react-router';
import moment                 from 'moment'
import PayrollContract        from '../../../config/Payroll.json'

/* component styles */
// import { styles } from './styles.scss';

/* actions */
import * as uiActionCreators from 'core/actions/actions-ui';
import * as web3ActionCreators from 'core/actions/web3';

import {
  Step,
  Stepper,
  StepLabel,
  StepContent
} from 'material-ui/Stepper';
import RaisedButton from 'material-ui/RaisedButton';
import FlatButton from 'material-ui/FlatButton';
import DatePicker from 'material-ui/DatePicker';
import TimePicker from 'material-ui/TimePicker';
import TextField from 'material-ui/TextField';
import Snackbar from 'material-ui/Snackbar';
import FloatingActionButton from 'material-ui/FloatingActionButton';
import ContentAdd from 'material-ui/svg-icons/content/add';

class HomeView extends Component {
  constructor(props) {
    super(props);
  }

  injectPayrollContract(instance) {
    const {actions} = this.props
    const {web3} = this.props.api
    actions.api.injectPayrollContract(instance)
    instance.startTime((err, val) => {
      this.props.actions.api.updatePayrollCache('contractStartDate', moment.unix(val.toNumber()).toDate())
    })
    instance.endTimestamp((err, val) => {
      this.props.actions.api.updatePayrollCache('contractEndDate', moment.unix(val.toNumber()).toDate())
    })
    instance.endTrialTimestamp((err, val) => {
      this.props.actions.api.updatePayrollCache('trialEndDate', moment.unix(val.toNumber()).toDate())
    })
    instance.owner((err, val) => {
      this.props.actions.api.updatePayrollCache('owner', val)
    })
    if (web3) {
      const filter = web3.eth.filter({
        fromBlock: 0,
        toBlock: 'latest',
        address: instance.address
        // topics: [null]
      })
      
      filter.watch((error, result) => {
        // console.log(error, result)
        console.log(result)
      })
      instance.allEvents({ fromBlock: 0 }, (err, result) => {
        actions.api.addEvent(result)
      })

      const pendingFilter = web3.eth.filter({
        fromBlock: 0,
        toBlock: 'pending',
        address: instance.address
        // topics: [null]
      })
      
      pendingFilter.watch((error, result) => {
        // console.log(error, result)
        console.log(result)
      })
    }
  }

  shouldComponentUpdate(nextProps) {
    const {match} = nextProps
    const {web3, payrollContract} = nextProps.api
    if (nextProps.match.path === '/home/:contractAddress?' && this.props.match.path === '/home/:contractAddress?') {
      if (nextProps.location.pathname === '/home' && this.props.location.pathname !== '/home') {
        this.props.actions.api.resetPayrollState()
        return false
      }
    }
    if (!web3) {
      return false
    }

    if (!payrollContract && match.params.contractAddress) {
      let Contract = web3.eth.contract(PayrollContract.abi)
      let payrollContract = Contract.at(match.params.contractAddress)
      this.props.api.web3 = web3
      this.injectPayrollContract(payrollContract)
    }
    return true
  }

  handleNext = () => {
    const {web3, accounts, stepIndex} = this.props.api
    console.log()
    if (stepIndex === 0) {
      const payrollContract = this.props.api.web3.eth.contract(PayrollContract.abi)
      let count = 0
      const totalTimeFrame = moment(this.props.api.payrollCache.contractEndDate).unix()
      const trialTimeFrame = moment(this.props.api.payrollCache.trialEndDate).unix()
      payrollContract.new(totalTimeFrame, trialTimeFrame, {
        from: this.props.api.accounts[0],
        data: PayrollContract.bytecode,
        gas: 4000000,
        gasPrice: 1000000000
      }, 
        (err, instance) => {
          if (err) {
            this.props.actions.api.updatePayrollCache('errorMessage', err.message)
            return
          }
          if (++count === 2) {
            this.injectPayrollContract(instance)
            this.props.actions.api.updatePayrollCache('confirmTx', null)
          } else {
            this.props.actions.api.updatePayrollCache('confirmTx', instance.transactionHash)
          }
        }
      )
    }

    if (stepIndex === 1) {
      this.props.api.payrollContract.deposit.sendTransaction({
        from: accounts[0], 
        value: web3.toWei(this.props.api.payrollCache.depositAmount, 'Ether'),
        gas: 100000,
        gasPrice: 1
      }, (err, hash) => {
        if (err) {
          this.props.actions.api.updatePayrollCache('errorMessage', err.message)
          return
        }
        this.props.actions.api.updatePayrollCache('confirmTx', hash)
      })
    }

    if (stepIndex === 2) {
      this.props.api.payrollContract.handShake({
        from: accounts[0],
        gas: 100000,
        gasPrice: 1
      }, (err, hash) => {
        if (err) {
          this.props.actions.api.updatePayrollCache('errorMessage', err.message)
          return
        }
        this.props.actions.api.updatePayrollCache('confirmTx', hash)
      })
    }

    if (stepIndex === 3) {
      this.cancel()
    }

    if (stepIndex === 4 || stepIndex === 5) {
      this.props.api.payrollContract.pay({
        from: accounts[0],
        gas: 100000,
        gasPrice: 1
      }, (err, hash) => {
        if (err) {
          this.props.actions.api.updatePayrollCache('errorMessage', err.message)
          return
        }
        this.props.actions.api.updatePayrollCache('confirmTx', hash)
      })
    }
  };

  cancel() {
    const {accounts, payrollContract} = this.props.api
    payrollContract.cancel({
      from: accounts[0],
      gas: 100000,
      gasPrice: 1
    }, (err, hash) => {
      if (err) {
        this.props.actions.api.updatePayrollCache('errorMessage', err.message)
        return
      }
      this.props.actions.api.updatePayrollCache('confirmTx', hash)
    })
  }

  handleSnackbarClose() {
    this.props.actions.api.updatePayrollCache('errorMessage', null)
  }

  renderStepActions(step) {
    const {stepIndex, payrollCache, accounts} = this.props.api;
    let actionLabel = 'Next', cancellable, primaryVisible = true
    switch (step){
    case 0: 
      actionLabel = 'Create Contract'
      break
    case 1:
      actionLabel = 'Send'
      break
    case 2:
      actionLabel = 'Confirm'
      break
    case 3:
      actionLabel = 'Cancel'
      break
    case 4:
      actionLabel = 'Pay Now'
      break
    case 5:
      actionLabel = 'Pay Now'
      break
    }

    if (payrollCache.confirmTx && step === stepIndex) {
      actionLabel = 'Confirming Transaction'
    }

    if (payrollCache.trialEndDate && moment().isBefore(payrollCache.trialEndDate)) {
      cancellable = (step >= 1 && step <= 2) && (stepIndex >= 1 && stepIndex <= 2)
    }

    if (step === 3 && payrollCache.owner !== accounts[0]) {
      primaryVisible = false
    }

    if ((step === 4 || step === 5) && payrollCache.payee !== accounts[0]) {
      primaryVisible = false
    }

    let disablePrimary = step !== stepIndex || payrollCache.cancelled || payrollCache.invalidTrialTime || (payrollCache.confirmTx? true : false)

    return (
      <div style={{margin: '12px 0'}}>
        {primaryVisible && <RaisedButton
          label={actionLabel}
          disableTouchRipple={true}
          disableFocusRipple={true}
          primary={true}
          onClick={this.handleNext}
          style={{marginRight: 12}}
          disabled={disablePrimary}
        />}
        {!payrollCache.cancelled && cancellable && (
          <FlatButton
            label="Cancel"
            disableTouchRipple={true}
            disableFocusRipple={true}
            onClick={this.cancel.bind(this)}
          />
        )}
        {payrollCache.cancelled && stepIndex === step && <div style={{margin: '12px 0', color: 'red'}}>Contract cancelled</div>}
      </div>
    );
  }

  updateContractEndDate(event, date) {
    this.props.actions.api.updatePayrollCache('contractEndDate', date)
  }

  updateTrialEndDate(event, date) {
    this.props.actions.api.updatePayrollCache('trialEndDate', date)
  }

  updateDepositAmount(event) {
    this.props.actions.api.updatePayrollCache('depositAmount', event.target.value)
  }

  render() {
    const {accounts, stepIndex, payrollCache} = this.props.api;
    // console.log(this.props.match.params.contractAddress, this.props.api.payrollContract)
    if (!this.props.match.params.contractAddress && this.props.api.payrollContract && this.props.api.payrollContract.address) {
      return <Redirect to={`/home/${this.props.api.payrollContract.address}`} />;
    }
    return (
      <div>
        <FloatingActionButton 
          style={{position:'fixed', bottom: 20, right: 20}} 
          onClick={() => {this.props.history.push('/home')}}
        >
          <ContentAdd />
        </FloatingActionButton>
        <div style={{maxWidth: 520, margin: 'auto'}}>
          {
            !accounts || !accounts.length ? 
            <div>Please make sure you have login your accounts in metamask extension</div> : 
            <div>
              <Stepper activeStep={stepIndex} orientation="vertical">
                <Step active={stepIndex >= 0}>
                  <StepLabel>Create Payroll Contract</StepLabel>
                  <StepContent>
                      <DatePicker
                        floatingLabelText="Contract End Date"
                        hintText="Contract End Date"
                        value={this.props.api.payrollCache.contractEndDate}
                        onChange={this.updateContractEndDate.bind(this)}
                        minDate={new Date()}
                        autoOk={true}
                        disabled={stepIndex !==0}
                      />
                      <TimePicker
                        format="ampm"
                        hintText="Time"
                        value={this.props.api.payrollCache.contractEndDate}
                        onChange={this.updateContractEndDate.bind(this)}
                        errorText={payrollCache.invalidContractTime? 'End of contract date time should not be in the past' : ''}
                        disabled={stepIndex !==0}
                      />
                      <DatePicker
                        floatingLabelText="Trial Period End Date"
                        hintText="Trial Period End Date"
                        value={this.props.api.payrollCache.trialEndDate}
                        onChange={this.updateTrialEndDate.bind(this)}
                        minDate={new Date()}
                        maxDate={this.props.api.payrollCache.contractEndDate}
                        autoOk={true}
                        disabled={stepIndex !==0}
                        />
                      <TimePicker
                        format="ampm"
                        hintText="Time"
                        value={this.props.api.payrollCache.trialEndDate}
                        onChange={this.updateTrialEndDate.bind(this)}
                        errorText={payrollCache.invalidTrialTime? 'End of trial date time should not be after the contract end date, or in the past' : ''}
                        disabled={stepIndex !==0}
                      />
                    {this.renderStepActions(0)}
                  </StepContent>
                </Step>
                <Step active={stepIndex >= 1}>
                  <StepLabel>Deposit</StepLabel>
                  <StepContent>
                    <TextField
                      type="number"
                      hintText="Total payment amount"
                      floatingLabelText="Amount of Eth"
                      value={this.props.api.payrollCache.depositAmount}
                      min="0"
                      onChange={this.updateDepositAmount.bind(this)}
                      // value={this.props.api.payrollCache.deposit}
                    />
                    {this.renderStepActions(1)}
                  </StepContent>
                </Step>
                <Step active={stepIndex >= 2}>
                  <StepLabel>Handshake</StepLabel>
                  <StepContent>
                    {
                      accounts && payrollCache.owner === accounts[0] && 
                      <div>
                        <p>Should use other account to confirm, other than using the contract owner's account: {payrollCache.owner}</p>
                        <p>Share this <a href={window.location.href}>url</a> to the employee to confirm and start this contract</p>
                      </div>
                    }
                    {this.renderStepActions(2)}
                  </StepContent>
                </Step>
                <Step active={stepIndex >= 3}>
                  <StepLabel>Trial Period</StepLabel>
                  <StepContent>
                    {payrollCache.trialEndDate && <p>Trial End Time: {payrollCache.trialEndDate.toString()}</p>}
                    {this.renderStepActions(3)}
                  </StepContent>
                </Step>
                <Step active={stepIndex >= 4}>
                  <StepLabel>Passed Trial Period</StepLabel>
                  <StepContent>
                    {
                      accounts && payrollCache.payee !== accounts[0] && 
                      <p>Payee account should be {payrollCache.payee}</p>
                    }
                    <p>Paid: {payrollCache.paidAmount || 0} eth</p>
                    <p>Remaining: {payrollCache.depositAmount - (payrollCache.paidAmount || 0)} eth</p>
                    <p>Contract Start Time: {payrollCache.contractStartDate && payrollCache.contractStartDate.toString()}</p>
                    <p>Contract End Time: {payrollCache.contractEndDate && payrollCache.contractEndDate.toString()}</p>
                    {stepIndex === 4 && this.renderStepActions(4)}
                  </StepContent>
                </Step>
                <Step active={stepIndex >= 5}>
                  <StepLabel>Completed Contract</StepLabel>
                  <StepContent>
                    <p>Paid: {payrollCache.paidAmount || 0} eth</p>
                    <p>Remaining: {payrollCache.depositAmount - (payrollCache.paidAmount || 0)} eth</p>
                    <p>Contract End Time: {payrollCache.contractEndDate && payrollCache.contractEndDate.toString()}</p>
                    {stepIndex === 5 && this.renderStepActions(5)}
                  </StepContent>
                </Step>
              </Stepper>
            </div>
          }
          <Snackbar
            open={payrollCache.errorMessage? true: false}
            message={payrollCache.errorMessage || ''}
            autoHideDuration={4000}
            onRequestClose={this.handleSnackbarClose.bind(this)}
          />
        </div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {api: state.api};
}

function mapDispatchToProps(dispatch) {
  return {
    actions: {
      ui: bindActionCreators(uiActionCreators, dispatch),
      api: bindActionCreators(web3ActionCreators, dispatch)
    }
  };
}


export default withRouter(connect(mapStateToProps, mapDispatchToProps)(HomeView))
