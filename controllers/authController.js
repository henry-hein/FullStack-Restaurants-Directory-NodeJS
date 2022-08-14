const passport = require('passport');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const crypto = require('crypto');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');

exports.login = passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash: 'Failed Login',
  successRedirect: '/',
  successFlash: 'You are now logged in.'
});

exports.logout = (req, res) => {
  req.logout();
  req.flash('success', 'You are now logged out!');
  res.redirect('/'); 
}

exports.isLoggedIn = (req, res, next) => {
  if(req.isAuthenticated()) {
    next();
    return;
  }
  req.flash('error', 'Opps you must be logged in!');
  res.redirect('/login');
};

exports.forgot = async (req, res) => {
  //See if the user exists
  const user = await User.findOne({ email: req.body.email });
  if(!user){
    req.flash('error', 'No account with this email exists!');
    return res.redirect('/login');
  }
  //Reset token and expiry on account
  user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
  user.resetPasswordExpires = Date.now() + 3600000; //Password reset token expires an hour from now
  await user.save();
  //Send them email with token
  const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
  await mail.send({
    user,
    subject: 'Password Reset',
    resetURL,
    filename: 'password-reset'
  })
  req.flash('success', `You have been emailed password reset link`);
  //Redirect to login page
  res.redirect('/login');
};

exports.reset = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if(!user) {
    req.flash('error', 'Password reset token is invalid or has expired.');
    return res.redirect('/login');
  }

  res.render('reset', { title: 'Reset your password' });
};

exports.confirmPasswords = (req, res, next) => {
  if(req.body.password === req.body['confirm-password']) {
    next();
    return;
  }
  req.flash('error', 'Passwords do not match!');
  res.redirect('back');
};

exports.update = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if(!user) {
    req.flash('error', 'Password reset token is invalid or has expired.');
    return res.redirect('/login');
  }

  const setPassword = promisify(user.setPassword, user);
  await setPassword(req.body.password);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  const updatedUser = await user.save();
  await req.login(updatedUser);
  req.flash('success', 'Your password has been reset! You are now logged in!');
  res.redirect('/');
}