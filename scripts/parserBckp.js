// Global variables
    var errorCount = 0;
    var tree;
    var verb;
    var symTable = new HashTable();
    
    
    function parse(verbose)
    {
	levelIn++;
	    
	verb = verbose;
        putMessage("Started Parsing");
        // Grab the next token.
        //currentToken = getNextToken();.
	    
        tree = parseProgram();
	
        //Report the results.
        putMessage("Parsing Completed with " + errorCount + " errors.");
	    
	levelIn--;
	printParseTree();
	printSymbolTable();
	
	return tree;
    }
    
     function parseProgram()
    {
	levelIn++;
	    
	if(verb)
	    putMessage("Attempting to parse program");
	var index = 0;
	var result;
	if(tokens[index].type != "T_BOF") //This is not a validly lexed program
	{
		putMessage("Warning: Token list was not properly lexed");
		putMessage("	Parser will attempt to parse.");
		errorCount++;
	}
	else //The beginning is lexographically sound, skip the BOF
		index++; 
	
	var statementParse = parseStatement(index);
	if(statementParse.type != "B_error") //Parsing the Statement did not result in errors
	{
		result = (new B_program(statementParse.size,statementParse));
		index+= statementParse.size;
	}
	else //Statement did not match
		result = new B_error("B_program",statementParse, statement.depth);

	var dollarMatch = matchToken("T_dollar", index);
	if(dollarMatch.type == "T_errorP") //The dollar was not parsed correctly
	{
		putMessage("Warning: Expected a dollar sign at the end of the program");
		if(dollarMatch.attempt != "T_EOF") //We didn't reach the end of the file in our parsing
			putMessage(" |--> Found: " + tokens[index].type);
	}
	
	if(verb)
		putMessage("Program parsed with "+result.size+" significant tokens");
	
	levelIn--;
	return result;
}

    function parseStatement(index)
    {
	levelIn++;
	if(verb)
		putMessage("Attempting to parse statement");
	var errors = new Array();
	var result;
	    
	printParse = parsePrintState(index);
	if(printParse.type != "B_error") //There is a working print statement match
	{
		result = printParse;
	}
	else 
	{
	    idParse = new parseIdState(index);
	
	    if(idParse.type != "B_error") //There is a working id statement match
	   {
		result = idParse;
	   }
	else
	   {
	    var varDeclParse = parseVarDecl(index);
	    if(varDeclParse.type != "B_error") //There is a working Var Decl statement match
	    {
		result = varDeclParse;
	    }
	else
	    {
	    var statementListParse = parseStatementListState(index);
	    if(statementListParse.type != "B_error") //There is a working statement list match
	    {
		result = statementListParse;
	    }
	else //nothing matches
	    {
	    var errors = [printParse,idParse,varDeclParse,statementListParse];
	    var likely = errorDepthAnalysis(errors);
		result = new B_error("B_statement", likely, likely.depth);
	    }
    }}}
	
	
	if(verb)
	{
		if(result.type == "B_error")
			putMessage("Not a statement");
		else
			putMessage("Statement parsed");
	}
	
	levelIn--;
	return result;
    }
    
    function parsePrintState(index)
    {
	levelIn++;
	if(verb)
		putMessage("Attempting to parse print statement");
	
	var result = new B_error();
	var startIndex = index;
	
	var printMatch = matchToken("T_print", index);
	index++;
	    if(printMatch.type != "T_errorP")
	    {
			var openParenMatch = matchToken("T_openParen", index);
			index++;
			if(openParenMatch.type != "T_errorP")
			{
				var exprParse = parseExpr(index);
				index+= exprParse.size;
				if(exprParse.type != "B_error")
				{
					var closeParenMatch = matchToken("T_closeParen", index);
					index++;
					if(closeParenMatch.type != "T_errorP") //This is a working print statement
					{
					result = (new B_printState(index-startIndex, exprParse));
					}
				}
			}
		}
	
	if(verb)
	{
		if(result.type == "B_error")
			putMessage("Not a print statement");
		else
			putMessage("Print statement parsed");
	}
	
	levelIn--;
	return result;
}


    function parseIdState(index)
    {
	levelIn++;
	if(verb)
		putMessage("Attempting to parse id assignment statement");
	    
	var result = new B_error();
	var startIndex = index;
	    
	var idParse= parseId(index);
	index+= idParse.size;
	if(idParse.type != "B_error")
	{
		var equalMatch = matchToken("T_equal", index);
		index++;
		if(equalMatch.type != "T_errorP")
		{
			var exprParse = parseExpr(index);
			index+= exprParse.size;
			if(exprParse.type != "B_error")//This is a working id statement
			{
				var ident = idParse.idT.inside;
				var value = exprParse

				if(symTable.hasItem(ident))
				{
					var existingVar = symTable.getItem(ident); //Retrieve the existing symbol defition to not overwrite it
					existingVar.value = value; //Set the new value
					symTable.setItem(ident, existingVar); //Put the symbol back in the table
				}
				else //This is a previously unseen variable, needs to be created
				{
					var newVar = new variable(undefined, value);
					symTable.setItem(ident, newVar); //Put the new symbol back in the table
				}
				result = (new B_idState(index-startIndex,
									idParse,
									exprParse));
			}
		}
	}
	
	if(verb)
	{
		if(result.type == "B_error")
			putMessage("Not an id assignment statement");
		else
			putMessage("Id assignment parsed");
	}
	    
	levelIn--;
	return result;
    }
    

function parseVarDecl(index)
    {
	levelIn++;
	if(verb)
		putMessage("Attempting to parse variable declaration");
    
	var result = new B_error();
	var startIndex = index;
	var typeMatch = matchToken("T_type", index);
	index++;
	if(typeMatch.type != "T_errorP")
	{
		
		var idParse = parseId( index);
		index+= idParse.size;
		if(idParse.type != "B_error")//This is a working variable declaration
		{
			var ident = idParse.idT.inside
			var type = typeMatch.inside
			
			if(symTable.hasItem(ident))
			{
				var existingVar = symTable.getItem(ident); //Retrieve the existing symbol defition to not overwrite it
				existingVar.type = type; //Set the new value
				symTable.setItem(ident, existingVar); //Put the symbol back in the table
			}
			else //This is a previously unseen variable, needs to be created
			{
				var newVar = new variable(type, "");
				symTable.setItem(ident, newVar); //Put the new symbol back in the table
			}
			
			result = (new B_varDecl(index-startIndex,
								typeMatch,
								idParse));
		}
	}

	if(verb)
	{
		if(result.type == "B_error")
			putMessage("Not a variable declaration");
		else
			putMessage("Variable declaration  parsed");
	}
	
	levelIn--
	return result;
    }
    
    
function parseStatementListState(index)
    {
	levelIn++;
	if(verb)
		putMessage("Attempting to parse statement list statement");
	    
	var result = new B_error();
	var startIndex = index;
	
	var openSBracketMatch = matchToken("T_openSBracket", index);
	index++;
	if(openSBracketMatch.type != "T_errorP")
	{
		var statementListParse = parseStatementList(index);
		index+= statementListParse.size;
		if(statementListParse.type != "B_error")
		{
			var closeSBracketMatch = matchToken("T_closeSBracket", index);
			index++;
			if(closeSBracketMatch.type != "T_errorP")//This is a working statement list statement
			{
				statementListParse.size = (index-startIndex); // Account for the closing SBracket
				result = statementListParse;
			}
		}
	}

	if(verb)
	{
		if(result.type == "B_error")
			putMessage("Not a statement list statement");
		else
			putMessage("Statement list statement parsed");
	}
	    
	levelIn--
	return result;
    }

function parseStatementList(index)
    {
	levelIn++;
	if(verb)
		putMessage("Attempting to parse statement list");
	    
	var result = new B_error();
	var startIndex = index;
	
	var closeSBracketMatch = matchToken("T_epsilon", index);
	if(closeSBracketMatch.type != "T_errorP") //The current token is epsilon
	{
		result = new B_statementList(0,"","");
		tokens.splice(index,1); //Delete the epsilon for indexing purposes
		index++;
	}
	else
	{
		if(verb)
			putMessage("List is not empty");
		var statementParse = parseStatement(index);
		index+= statementParse.size;
		if(statementParse.type != "B_error")
		{
			var statementListParse = parseStatementList(index);
			index+= statementListParse.size;
			if(statementListParse.type != "B_error") //This is a working statement list
			{
				result = (new B_statementList(index-startIndex,
										statementParse,
										statementListParse));
			}
		}
	}
	
	if(verb)
	{
		if(result.type == "B_error")
			putMessage("Not a statement list");
		else
			putMessage("Statement list parsed");
	}
	    
	levelIn--
	return result;
    }


function parseExpr(index)
    {
	levelIn++;
	if(verb)
		putMessage("Attempting to parse expression");
	
	var result = new B_error;
	intExprParse = parseIntExpr(index);
	if(intExprParse.type != "B_error") //There is a working int expression match
	{
		result = intExprParse;
	}
	else 
	{
	    charExprParse = parseCharExpr(index);
	    if(charExprParse.type != "B_error") //There is a working char expression match
	   {
		result = charExprParse;
	   }
	else
	   {
	   var idParse = parseId(index);
	    if(idParse.type != "B_error") //There is a working id match
	    {
		result = idParse;
	    }
	else //This is not a valid statement
	{
	    result = (new B_error());
	}}}
	
	if(verb)
	{
		if(result.type == "B_error")
			putMessage("Not an expression");
		else
			putMessage("Expression parsed");
	}
	
	levelIn--;
	return result;
    }
    
    
    function parseIntExpr(index)
    {
	levelIn++;
	if(verb)
		putMessage("Attempting to parse int expression");
	    
	var result = new B_error();
	
	intExprWOpParse = parseIntExprWOp(index);
	if(intExprWOpParse.type != "B_error") //There is a working int expression with operator match
	{
		result = (new B_intExpr(intExprWOpParse.size,intExprWOpParse));
	}
	else
	{
		digitMatch = matchToken("T_digit",index);
			if(digitMatch.type != "T_errorP") //There is a digit, and thus a match
			{
				result = (new B_intExpr(1,digitMatch));
			}
	}
	
	if(verb)
	{
		if(result.type == "B_error")
			putMessage("Not an int expression");
		else
			putMessage("Int expression parsed");
	}
	
	levelIn--;
	return result;
    }
    

function parseIntExprWOp(index)
    {
	levelIn++;
	if(verb)
		putMessage("Attempting to parse int expression with an operator");
	    
	var result = new B_error();
	var startIndex = index;
	    
	var digitMatch = matchToken("T_digit", index);
	index++;
	if(digitMatch.type != "T_errorP")
	{
		var opMatch = matchToken("_op", index);
		index++;
		if(opMatch.type != "T_errorP")
		{
			var exprParse = parseExpr(index);
			index+= exprParse.size;
			if(exprParse.type != "B_error") //There is a working int expression with operator match
			{
				result = (new B_intExprWOp(index-startIndex,
									digitMatch,
									opMatch,
									exprParse));
			}
		}
	}

	if(verb)
	{
		if(result.type == "B_error")
			putMessage("Not an int expression with operator");
		else
			putMessage("Int expression with operator parsed");
	}
	
	levelIn--;
	return result;
    }
    
    
    function parseCharExpr(index)
    {
	levelIn++;
	if(verb)
		putMessage("Attempting to parse char expression");
    
	var result = new B_error();
	var startIndex = index;
	    
	var openQouteMatch = matchToken("T_qoute", index);
	index++;
	if(openQouteMatch.type != "T_errorP")
	{
		var charListParse = parseCharList(index);
		index+= charListParse.size;
		if(charListParse.type != "B_error")
		{
			var closeQouteMatch = matchToken("T_qoute", index);
			index++;
			if(closeQouteMatch.type != "T_errorP") //This is a valid character expression
			{
				charListParse.size = index-startIndex; //Account for the surrounding qoutes
				result = charListParse;
			}
		}
	}

	if(verb)
	{
		if(result.type == "B_error")
			putMessage("Not a char expression");
		else
			putMessage("Char expression parsed");
	}
	
	levelIn--;
	return result;
    }
    
    
function parseCharList(index)
    {
	levelIn++;
	if(verb)
		putMessage("Attempting to parse char list");
    
	var result = new B_error();
	var startIndex = index;

	var qouteMatch = matchToken("T_epsilon", index);
	if(qouteMatch.type != "T_errorP") //The current token is epsilon
	{
		result = new B_statementList(0,"","");
		tokens.splice(index,1); //Delete the epsilon for indexing purposes
		index++;
	}
	else
	{
		if(verb)
			putMessage("List is not empty");
		
		var charMatch = matchToken("T_char", index);
		index++;
		if(charMatch.type != "T_errorP")
		{
			var charListParse = parseCharList(index);
			if(charListParse.size == 0)
				index++; //account for epsilon
			index+= charListParse.size;
			if(charListParse.type != "B_error") //This is a working char list
			{
				result = (new B_charList(index-startIndex,
									charMatch,
									charListParse));
			}
		}
	}

	if(verb)
	{
		if(result.type == "B_error")
			putMessage("Not a char list");
		else
			putMessage("Char list parsed");
	}
	
	levelIn--;
	return result;
    }

function parseId(index)
    {
	levelIn++;
	if(verb)
	    putMessage("Attempting to parse an id");
	    
	var result = new B_error();
	var startIndex = index;
	    
	var charMatch = matchToken("T_userId", index);
	if(charMatch.type != "T_errorP") // This is a valid type
		result = (new B_id(1, charMatch));

	if(verb)
	{
		if(result.type == "B_error")
			putMessage("Not an id");
		else
			putMessage("Id parsed");
	}
	    
	levelIn--;
	return result;
    }

    function matchToken(type, index)
    {
	levelIn++;
	    
	var token = tokens[index];
	var result;
	    
	if(verb)
		putMessage("Match Token matching token type: " + token.type + " to " + type);
	if(token.type == type)
	    result = token;
	else
	{
		//Regular Expressions of acceptable general search types
		var operationRege = /T_[plus|sub]/;
		switch(type)
		{
		case "_op":   
			if(operationRege.test(token.type))
				result = token;
			else
				result = new T_errorP(type);
			    break;
		default:        
				result = new T_errorP(type);
				break;	
			}
	}
	
	levelIn--;
	return result;
	    
    }
    

    
//Block Definitions
function B_program(size, statement)
   {
	this.size = size;
	this.statement = statement;
	this.type ="B_program";
   }
   
function B_printState(size, expr)
   {
	   this.size = size;
	   this.expr = expr;
	this.type ="B_printState";
   }
   
function B_idState(size, id, expr)
   {
	   this.size = size;
	   this.id = id;
	   this.expr = expr;
	this.type ="B_idState";
   }
   
   
function B_varDecl(size, kind, id)
   {
	   this.size = size;
	   this.kind = kind;
	   this.id = id;
	this.type ="B_varDecl";
   }
   
function B_statementList(size, statement, statementList)
   {
	   this.size = size;
	   this.statement = statement;
	   this.statementList = statementList;
	this.type ="B_statementList";
   }
   
function B_intExpr(size, inner)
   {
	   this.size = size;
	   this.inner = inner;
	this.type ="B_intExpr";
   }
   
function B_intExprWOp(size, digitT, op, expr)
   {
	   this.size = size;
	   this.digitT = digitT;
	   this.op = op;
	   this.expr = expr;
	this.type ="B_intExprWOp";
   }
   
function B_charList(size, charT, charList)
   {
	   this.size = size;
	   this.charT = charT;
	   this.charList = charList;
	this.type ="B_charList";
   }
   
function B_id(size, idT)
   {
	   this.size = size;
	   this.idT = idT;
	this.type ="B_id";
   }
   
function B_error(step, block, depth)
   {
	this.step = step
	this.problem = block;
	this.depth = depth;
	this.size = -1;
	this.type ="B_error";
   }
    
    
//Parse Error Token
function T_errorP(attempt)
   {
	   this.type ="T_errorP";
	   this.attempt = attempt;
   }
    
   
   
   //Manages the symbol table (hash table) object type
function HashTable(table)
{
    //Based on the model provided by Dan Allen at http://www.mojavelinux.com/articles/javascript_hashes.html
    this.size = 0;
    this.items = {};
    for (var ident in table) {
        if (table.hasOwnProperty(indent)) {
            this.items[indent] = table[ident];
            this.size++;
        }
    }

    this.setItem = function(key, value)
    {
        var previous = undefined;
        if (this.hasItem(key)) {
            previous = this.items[key];
        }
        else {
            this.size++;
        }
        this.items[key] = value;
        return previous;
    }

    this.getItem = function(key) {
        if(this.hasItem(key))
		return this.items[key];
	else
		return undefined;
    }

    this.hasItem = function(key)
    {
        return this.items.hasOwnProperty(key);
    }
   
    this.removeItem = function(key)
    {
        if (this.hasItem(key)) {
            previous = this.items[key];
            this.size--;
            delete this.items[key];
            return previous;
        }
        else {
            return undefined;
        }
    }

    this.keys = function()
    {
        var keys = [];
        for (var k in this.items) {
            if (this.hasItem(k)) {
                keys.push(k);
            }
        }
        return keys;
    }

    this.values = function()
    {
        var values = [];
        for (var k in this.items) {
            if (this.hasItem(k)) {
                values.push(this.items[k]);
            }
        }
        return values;
    }

    this.clear = function()
    {
        this.items = {}
        this.size = 0;
    }
}

function variable(type, value){
	this.type = type;
	this.value = value;
	if(verb)
		putMessage("Variable created of type " + type + " and value " + value);
}
   
   
   
//Prints the completed Parse Tree
function printParseTree(){
	var parseReturnText = "\nParse Tree: \n" + printTree(tree,0);
	putMessage(parseReturnText);
}
   
   
function printTree(tree, indent)
   {
	var result = "";
	//Generate the proper offset
	for(var i=0;i<indent;i++)
		result += "  ";
	
	var root = tree.type;
	   
	if(/T_[userId|type|digit|char]/.test(root))//This is one of the tokens with extra information
		result += "[" + root + "]---"+tree.inside+"\n";
	else
		result += "[" + root + "]\n";

	if(!/T_*/.test(root)) //This is not a token leaf
	{
		//Recursively collect the rest of the tree
		switch (root) {
			case "B_program":
				result += printTree(tree.statement,indent+1);
				break;
			case "B_printState":
				result += printTree(tree.expr,indent+1);
				break;
			case "B_idState":
				result += printTree(tree.id,indent+1);
				result += printTree(tree.expr,indent+1);
				break;
			case "B_varDecl":
				result += printTree(tree.kind,indent+1);
				result += printTree(tree.id,indent+1);
				break;
			case "B_statementList":
				if(tree.size > 0)//this isn't the empty list
				{
					result += printTree(tree.statement,indent+1);
					result += printTree(tree.statementList,indent+1);
				}
				break;
			case "B_intExpr":
				result += printTree(tree.inner,indent+1);
				break;
			case "B_intExprWOp":
				result += printTree(tree.digitT,indent+1);
				result += printTree(tree.op,indent+1);
				result += printTree(tree.expr,indent+1);
				break;
			case "B_charList":
				if(tree.size > 0)//this isn't the empty list
				{
					result += printTree(tree.charT,indent+1);
					result += printTree(tree.charList,indent+1);
				}
				break;
			case "B_id":
				result += printTree(tree.idT,indent+1);
				break;
			case "B_error":
				break;
			default:
				result += "[???]";
				break;
		}
	}
	
	return result;
}


function printSymbolTable()
{
	var identifiers = symTable.keys();
	var varObjs = symTable.values();
	
	putMessage("         Symbol Table       ");
	putMessage("Identifier |Type        |Value");
	
	for(var i=0;i<identifiers.length;i++){
			putMessage(""+identifiers[i] + "           "+ varObjs[i].type +"     "+ varObjs[i].value.type);
	}
}
	
	
	
	
	
	