<?php
require_once('modules/CobroPago/Purchase.php');

$purchase = new Purchase();
$response = $purchase->notification($_REQUEST['cpid']);

@include('modules/CobroPago/CustomPaymentNotification.php');
