<?php
require_once('modules/CobroPago/Purchase.php');

$options = array(
	'notifyUrl' => $_REQUEST['notify_url'],
	'returnUrl' => $_REQUEST['return_url'],
	'cancelUrl' => $_REQUEST['cancel_url'],
);

$purchase = new Purchase();
$response = $purchase->pay($_REQUEST['cpid'], $options);

if ($response->isSuccessful()) {
  if (isset($options['returnUrl'])) {
    header('Location: ' . $options['returnUrl']);
    exit;
  }
  $message = getTranslatedString('Payment done.');
} elseif ($response->isRedirect()) {
	$message = getTranslatedString('Redirecting to payment gateway...');
} else {
  if (isset($options['cancelUrl'])) {
    header('Location: ' . $options['cancelUrl']);
    exit;
  }
	$message = getTranslatedString('Payment error.');
}

require('modules/CobroPago/Pay.tpl.php');
