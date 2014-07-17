<?php
require_once('coreboswslibrary/php/WSClient.php');
require_once('include/utils/utils.php');
require('vendor/autoload.php');
require_once('Pay.config.php');

use Omnipay\Omnipay;
use Omnipay\Common\CreditCard;

class Purchase {

	public $ws;

	function __construct() {
		global $PURCHASE_CONFIG;
		$this->ws = new Vtiger_WSClient($PURCHASE_CONFIG['corebos']['server']);
		$this->ws->doLogin($PURCHASE_CONFIG['corebos']['username'], $PURCHASE_CONFIG['corebos']['accessKey']);
	}

	// get one contact with given NIF exists
	public function contactByNif($nif) {
		$sql = "select * from Contacts where nif='$nif' limit 1";
		$rdo = $this->ws->doQuery($sql);
		return $rdo;
	}

	public function prepare($data) {
		$contact = array(
			'nif' => $data['nif'],
			'firstname' => $data['firstname'],
			'lastname' => $data['lastname'],
			'mobile' => $data['mobile'],
			'email' => $data['email'],
			'description' => $data['moreinfo'],
		);
		$contactByNIF = $this->contactByNif($contact['nif']);
		if (empty($contactsByNif)) {
			$result = $this->ws->doCreate('Contacts', $contact);
			$contactId = $result['id'];
		} else {
			$contactId = $contactByNif[0]['id'];
		}

		$items = json_decode($data['cartitems'], true);
		$salesorder =  array (
			'subject' => $data['subject'],
			'bill_city' => '',
			'bill_code' => '',
			'bill_country' => '',
			'bill_pobox' => '',
			'bill_state' => '',
			'bill_street' => '',
			'account_id' => '', // XXX Optional only for mes3events
			'carrier' => NULL,
			'contact_id' => $contactId,
			'conversion_rate' => '1.000',
			'currency_id' => '21x1',
			'customerno' => $tid,
			'transaccion' => '',
			'description' => $data['moreinfo'],
			'duedate' => $data['fecha'],
			'enable_recurring' => '0',
			'end_period' => NULL,
			'exciseduty' => '0.000',
			'invoicestatus' => 'Approved',
			'payment_duration' => NULL,
			'pending' => NULL,
			'potential_id' => NULL,
			'vtiger_purchaseorder' => NULL,
			'quote_id' => NULL,
			'recurring_frequency' => NULL,
			'salescommission' => '0.000',
			'ship_city' => '',
			'ship_code' => '',
			'ship_country' => '',
			'ship_pobox' => '',
			'ship_state' => '',
			'ship_street' => '',
			'sostatus' => 'Approved',
			'start_period' => NULL,
			'salesorder_no' => NULL,
			'terms_conditions' => NULL,
			'discount_type_final' => 'percentage',  //  zero/amount/percentage
			'hdnDiscountAmount' => '0',  // only used if 'discount_type_final' == 'amount'
			'hdnDiscountPercent' => '0',  // only used if 'discount_type_final' == 'percentage'
			'shipping_handling_charge' => 0,
			'shtax1' => 0,   // apply this tax, MUST exist in the application with this internal taxname
			'shtax2' => 0,   // apply this tax, MUST exist in the application with this internal taxname
			'shtax3' => 0,   // apply this tax, MUST exist in the application with this internal taxname
			'adjustmentType' => 'none',  //  none/add/deduct
			'adjustment' => '0',
			'taxtype' => 'group',  // group or individual  taxes are obtained from the application
			'pdoInformation' => array(
				array(
					"productid"=>$data['pdoid'],
					"comment"=>$data['fecha'],
					"qty"=>$items[0]['Quantity'],
					"listprice"=>($items[0]['Price']/1.21),
					'discount'=>0,  // 0 no discount, 1 discount
					"discount_type"=>0,  //  amount/percentage
					"discount_percentage"=>0,  // not needed nor used if type is amount
					"discount_amount"=>0,  // not needed nor used if type is percentage
				),
			),
		);
		$result = $this->ws->doCreate('SalesOrder', $salesorder);
		$salesorderId = $result['id'];
		var_dump($salesorderId, $salesorder); exit;

		$cobropago = array(
			'reference' => $data['subject'],
			'parent_id' => $contactId,
			'related_id' => $salesorderId,
			'register' => $data['fecha'],
			'duedate' => $data['fecha'],
			'amount' => $items[0]['Price'],
		);
		$result = $this->ws->doCreate('CobroPago', $cobropago);
	}

	public function pay($cobropagoId, $options = array(), $complete = false) {
		global $PURCHASE_CONFIG, $site_URL;

		$notifyUrl = '';
		if (isset($options['notifyUrl'])) {
			$notifyUrl = $options['notifyUrl'];
		}

		$defaults = array(
			'returnUrl' => "{$site_URL}/index.php?action=DetailView&module=CobroPago&record={$cobropagoId}",
			'cancelUrl' => "{$site_URL}/index.php?action=DetailView&module=CobroPago&record={$cobropagoId}",
		);
		$options = array_merge($defaults, $options);

		$options['notifyUrl'] = "{$site_URL}/PaymentNotification.php?cpid={$cobropagoId}";

		$current_user = new Users();
		$current_user->retrieveCurrentUserInfoFromFile(1);

		if (preg_match('/^\d+$/', $cobropagoId)) {
			$describeCobroPago = $this->ws->doDescribe('CobroPago');
			$cobropagoId = $describeCobroPago['idPrefix'] . 'x' . $cobropagoId;
		}

		$gateway = Omnipay::create($PURCHASE_CONFIG['omnipay']['driver']);
		$gateway->initialize($PURCHASE_CONFIG['omnipay']);

		$cobropago = $this->ws->doRetrieve($cobropagoId);

		if (empty($cobropago) || $cobropago['paid'] || $cobropago['credit']) {
			throw new Exception('CPID_ERROR');
		}

		$contactId = $cobropago['parent_id'];
		$contact = $this->ws->doRetrieve($contactId);

		$card = new CreditCard(array(
			'billingFirstName' => $contact['firstname'],
			'billingLastName' => $contact['lastname'],
			'email' => $contact['email'],
		));

		$parameters = array(
			'amount' => $cobropago['amount'],
			'transactionId' => $cobropagoId,
			'currency' => 'EUR',
			'card' => $card,
			'extraData' => $notifyUrl,
		);

		if ($PURCHASE_CONFIG['omnipay']['testmode']) {
			$parameters['transactionId'] = mt_rand();
		}

		$parameters += $options;

		if ($complete) {
			$response = $gateway->completePurchase($parameters)->send();
		} else {
			$response = $gateway->purchase($parameters)->send();
		}

		if ($response->isSuccessful()) {
			$cobropago['paid'] = 1;
			$this->ws->doUpdate('CobroPago', $cobropago);
		}

		return $response;
	}

	public function notification($cobropagoId) {
		$response = $this->pay($cobropagoId, array(), true);
		$extraData = $response->getExtraData();
		if (!empty($extraData)) {
			$notifyUrl = json_decode($extraData);
			$options = array(
				'http' => array(
					'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
					'method'  => 'POST',
					'content' => http_build_query($response->getData()),
				),
			);
			$context  = stream_context_create($options);
			$result = file_get_contents($notifyUrl, false, $context);
		}
	}

}
