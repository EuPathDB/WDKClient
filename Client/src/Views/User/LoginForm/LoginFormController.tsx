import * as React from 'react';
import { connect } from 'react-redux';
import { hideLoginForm, submitLoginForm } from 'wdk-client/Views/User/UserActionCreators';
import LoginForm from 'wdk-client/Views/User/LoginForm/LoginForm';
import { RootState } from 'wdk-client/Core/State/Types';
import ViewController from 'wdk-client/Core/Controllers/ViewController';

const enhance = connect(
  ({ globalData: { loginForm }}: RootState) => ({
    destination: loginForm ? loginForm.destination || window.location.href : window.location.href,
    isOpen: loginForm ? loginForm.isOpen : false,
    message: loginForm ? loginForm.message || '' : ''
  }),
  { hideLoginForm, submitLoginForm }
)

type Props = {
  destination: string;
  isOpen: boolean;
  message: string;
  hideLoginForm: typeof hideLoginForm;
  submitLoginForm: typeof submitLoginForm;
}

export default enhance(class LoginFormController extends ViewController<Props> {

  cancel = () => {
    this.props.hideLoginForm();
  }

  submit = (email: string, password: string) => {
    const { destination } = this.props;
    this.props.submitLoginForm( email, password, destination);
  }

  renderView() {
    const { isOpen, message } = this.props;
    return (
      <LoginForm
        open={isOpen}
        message={message}
        passwordResetPath="/user/forgot-password"
        registerPath="/user/registration"
        onCancel={this.cancel}
        onSubmit={this.submit}
      />
    );
  }
});
