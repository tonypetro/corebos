/*+**********************************************************************************
 * The contents of this file are subject to the vtiger CRM Public License Version 1.0
 * ("License"); You may not use this file except in compliance with the License
 * The Original Code is:  vtiger CRM Open Source
 * The Initial Developer of the Original Code is vtiger.
 * Portions created by vtiger are Copyright (C) vtiger.
 * All Rights Reserved.
 ************************************************************************************/
/**
 * Usage:
 * 
 * (new FieldDependencies(datasource)).init(document.forms['EditView']); // Default form EditView in case not provided.
 * 
 * datasource Format:
 * 
 * datasource = { 
 * 		"sourcefieldname1" : {
 * 
 * 			"sourcevalue1" : {
 * 				"targetfieldname" : ["targetvalue1", "targetvalue2"]
 *	 		},
 * 			"sourcevalue2" : {
 * 				"targetfieldname" : ["targetvalue3", "targetvalue4"]
 * 			},
 * 
 * 			"sourcevalue3" : {
 * 				"targetfieldname" : false // This will enable all the values in the target fieldname
 * 			},
 * 
 * 			// NOTE: All source values (option) needs to be mapped in the datasource
 * 
 * 		},
 * 
 * 		"sourcefieldname2" : {
 * 			// ...
 * 		} 			
 * }
 * 
 * NOTE: Event.fire(targetfieldnode, 'dependent:change'); is triggered on the field value changes.
 * 
 */
 
/**
 * Class FieldDependencies
 * 
 * @param datasource
 */
function FieldDependencies(datasource) {
	this.baseform = false;	
	this.DS = {};
	
	this.initDS(datasource);
}

/**
 * Initialize the data source
 */
FieldDependencies.prototype.initDS = function(datasource) {
	if(typeof(datasource) != 'undefined') {
		this.DS = datasource;
	}
}

/**
 * Initialize the form fields (setup onchange and dependent:change) listeners
 * and trigger the onchange handler for the loaded select fields.
 *
 * NOTE: Only select fields are supported.
 *
 */
FieldDependencies.prototype.setup = function(sourceform, datasource) {
	var thisContext = this;

	if(typeof(sourceform) == 'undefined') {
		this.baseform = document.forms['EditView'];
	} else {
		this.baseform = sourceform;
	}

	this.initDS(datasource);

	if(!this.baseform) return;

	jQuery('input', this.baseform).
		bind('change', function(ev){thisContext.actOnSelectChange(ev);});
        jQuery('select', this.baseform).
		bind('change', function(ev){thisContext.actOnSelectChange(ev);});
}

/**
 * Initialize the form fields (setup onchange and dependent:change) listeners
 * 
 * NOTE: Only select fields are supported.
 * 
 */
FieldDependencies.prototype.init = function(sourceform, datasource) {	
	this.setup(sourceform, datasource);

	for(var sourcename in this.DS) {
		jQuery('[name="'+sourcename+'"]', this.baseform).trigger('change');
	}
}

/**
 * On Change handler for select box.
 */
FieldDependencies.prototype.actOnSelectChange = function(event) {
	var sourcenode = event.target;	
	var sourcename = sourcenode.name;
	var sourcevalue = sourcenode.value;
        var field,comparator,value,columncondition,fieldName;
        var i=0;
        var conditions=new Array();
        if(this.DS[sourcename]!==undefined){
            for(i=0;i<this.DS[sourcename].length;i++){
                var responsibleConfig=this.DS[sourcename][i];
                conditions=responsibleConfig['conditions']!=='' ?  JSON.parse(responsibleConfig['conditions']) : conditions;
                var conditionResp='';
                conditionResp =' ( ';
                for(var j=0;j<conditions.length;j++){
                    field=conditions[j]['columnname'];
                    comparator=conditions[j]['comparator'];
                    value=conditions[j]['value'];
                    columncondition=conditions[j]['columncondition'];
                    fieldName=field.split(':');
                    field=fieldName[1];
                    switch(comparator){
                        case 'e': conditionResp+= sourcevalue===value;break;
                        case 'n': conditionResp+= sourcevalue!==value;;break;
                        case 's': conditionResp+= sourcevalue.startsWith(value);break;
                        case 'Ns': conditionResp+= !sourcevalue.startsWith(value);break;
                        case 'ew': conditionResp+= sourcevalue.endsWith(value);break;
                        case 'New': conditionResp+= !sourcevalue.endsWith(value);break;
                        case 'c': conditionResp+= sourcevalue.indexOf(value)!==-1;break;
                        case 'k': conditionResp+= sourcevalue.indexOf(value)===-1;break;
                        case 'l': conditionResp+= sourcevalue < value;break;
                        case 'g': conditionResp+= sourcevalue > value;break;
                        case 'm': conditionResp+= sourcevalue <= value;break;
                        case 'h': conditionResp+= sourcevalue >= value;break;
                        default:
                            conditionResp+=false;break;
                    }
                    if(columncondition!==''){
                        columncondition=conditions[j]['columncondition']==='or' ? ' || ' : ' && ';
                        conditionResp +=' '+columncondition+' ';
                    }
                }
                conditionResp +=' )';
                if(eval(conditionResp) || conditions.length===0){
                    if(this.DS[sourcename][i]['actions']['change']!== undefined && this.DS[sourcename][i]['actions']['change'].length > 0){
                        this.fieldValueChange(sourcename, sourcevalue,this.DS[sourcename][i]['actions']['change']);
                    }
                    if(this.DS[sourcename][i]['actions']['hide'] !== undefined && this.DS[sourcename][i]['actions']['hide'].length > 0){
                        this.fieldHide(sourcename, sourcevalue,this.DS[sourcename][i]['actions']['hide']);
                    }
                    if(this.DS[sourcename][i]['actions']['readonly'] !== undefined && this.DS[sourcename][i]['actions']['readonly'].length > 0){
                        this.fieldReadonly(sourcename, sourcevalue,this.DS[sourcename][i]['actions']['readonly']);
                    }
                    if(this.DS[sourcename][i]['actions']['deloptions'] !== undefined && this.DS[sourcename][i]['actions']['deloptions'].length > 0){
                        this.fieldOptions(sourcename, sourcevalue,this.DS[sourcename][i]['actions']['deloptions'],'deloptions');
                    }
                    if(this.DS[sourcename][i]['actions']['setoptions'] !== undefined && this.DS[sourcename][i]['actions']['setoptions'].length > 0){
                        this.fieldOptions(sourcename, sourcevalue,this.DS[sourcename][i]['actions']['setoptions'],'setoptions');
                    }
                }
                else{
                    if(this.DS[sourcename][i]['actions']['hide'] !== undefined && this.DS[sourcename][i]['actions']['hide'].length > 0){
                        this.fieldShow(sourcename, sourcevalue,this.DS[sourcename][i]['actions']['hide']);
                    }
                    if(this.DS[sourcename][i]['actions']['readonly'] !== undefined && this.DS[sourcename][i]['actions']['readonly'].length > 0){
                        this.fieldEditable(sourcename, sourcevalue,this.DS[sourcename][i]['actions']['readonly']);
                    }                    
                }
            }           
        }
};

/**
 * Core function to handle the state of field value changes and 
 * trigger dependent:change event if (Event.fire API is available - Prototype 1.6)
 */
FieldDependencies.prototype.fieldOptions = function(sourcename, sourcevalue,targetFields,type) {
	console.log(targetFields);
    if(targetFields != null && targetFields != undefined) {
        for(var i=0;i<targetFields.length;i++){
            var targetname=targetFields[i]['field'];
            var targetvalues=targetFields[i]['options'];
            var targetnode = jQuery('[name="'+targetname+'"]', this.baseform);
            var selectedtargetvalue = targetnode.val();

            // In IE we cannot hide the options!, the only way to achieve this effect is
            // recreating the options list again. 
            //
            // To maintain implementation consistency, let us keep copy of options in select node and use it for re-creation
            if(typeof(targetnode.data('allOptions')) == 'undefined') {
                     var allOptions = [];
                    jQuery('option', targetnode).each(function(index,option) {
                            allOptions.push(option);
                    });
                    targetnode.data('allOptions', allOptions);
            }
            var targetoptions = targetnode.data('allOptions');

            // Remove the existing options nodes from the target selection
            jQuery('option', targetnode).remove();

            for(var index = 0; index < targetoptions.length; ++index) {
                    var targetoption = jQuery(targetoptions[index]);
                    // Show the option if field mapping matches the option value or there is not field mapping available.
                    if( (targetvalues == false || targetvalues.indexOf(targetoption.val()) !== -1) && type==='setoptions') {
                            var optionNode = jQuery(document.createElement('option'));
                            targetnode.append(optionNode);
                            optionNode.text(targetoption.text());
                            optionNode.val(targetoption.val());
                    }
                    else if( (targetvalues.indexOf(targetoption.val()) === -1) && type==='deloptions') {
                            var optionNode = jQuery(document.createElement('option'));
                            targetnode.append(optionNode);
                            optionNode.text(targetoption.text());
                            optionNode.val(targetoption.val());
                    }
            }
            targetnode.val(selectedtargetvalue);
            targetnode.trigger('change');
        }
    }
}

FieldDependencies.prototype.fieldValueChange = function(sourcename, sourcevalue,targetFields) {
    var field,value='';
    console.log(targetFields);
    for(var i=0;i<targetFields.length;i++){
        field=targetFields[i]['field'];
        value=targetFields[i]['value'];
        if(document.getElementsByName(field).item(0) !== undefined && document.getElementsByName(field).item(0) !== null){
            document.getElementsByName(field).item(0).value=value;
        }
    }
    
}

FieldDependencies.prototype.fieldHide = function(sourcename, sourcevalue, hideFields) {
    var field='';
    for(var i=0;i<hideFields.length;i++){
        field=hideFields[i]['field'];
        document.getElementById('td_'+field).style.visibility='hidden';
        document.getElementById('td_val_'+field).style.visibility='hidden';
    }
}

FieldDependencies.prototype.fieldShow = function(sourcename, sourcevalue, hideFields) {
    var field='';
    for(var i=0;i<hideFields.length;i++){
        field=hideFields[i]['field'];
        document.getElementById('td_'+field).style.visibility='visible';
        document.getElementById('td_val_'+field).style.visibility='visible';
    }
}

FieldDependencies.prototype.fieldReadonly = function(sourcename, sourcevalue, readonlyFields) {
    var field='';
    for(var i=0;i<readonlyFields.length;i++){
        field=readonlyFields[i]['field'];
//        document.getElementById(field).readOnly=true; // it will not work for picklists, only for input
        document.getElementById(field+'_hidden').innerHTML=document.getElementsByName(field).item(0).value;
        document.getElementById(field+'_hidden').style.display='inline';
        document.getElementsByName(field).item(0).style.display='none';
    }
}

FieldDependencies.prototype.fieldEditable = function(sourcename, sourcevalue, readonlyFields) {
    var field='';
    for(var i=0;i<readonlyFields.length;i++){
        field=readonlyFields[i]['field'];
        document.getElementsByName(field).item(0).style.display='inline';
        document.getElementById(field+'_hidden').style.display='none';
    }
}
