<div style="margin:2em;text-align:center">
  <p>
    <?php echo $message;?>
  </p>
	<form id="payment_form" method="POST" action="<?php echo $response->getRedirectUrl(); ?>">
		<?php foreach ($response->getRedirectData() as $key => $value): ?>
			<input type="hidden" name="<?php echo $key;?>" value="<?php echo $value;?>">
		<?php endforeach; ?>
	</form>
	<script type="text/javascript">
		document.getElementById('payment_form').submit();
	</script>
</div>
