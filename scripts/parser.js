// Global variables
    var tree;
    var verb;
    var symTable;
    var errorCount;
    var errors;
    
    
    function parse(verbose)
    {
    levelIn++;
	
	//Initialize gloal vars
	errorCount = 0;
	errors = new Array();
	    
	verb = verbose;
	tree = "";
	symTable = new HashTable();
	    
        putMessage("Started Parsing");
        tree = parseProgram();
	
        //Report the results.
        putMessage("Parsing Completed with "+errorCount+" errors.");
	    
//	if(tree.type != "B_error") //No errors
	  //  {
	//	putMessage("Program was syntactically valid");
		levelIn--;
		printParseTree();
		printSymbolTable();
	//    }
//	else //Encountered an error
	 //   {
	//	putMessage("Program was not syntactically valid");
	//	levelIn--;
		errorHandler();
	  //  }
	
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
		result = new B_error("B_program","Start to a program", statementParse.found, statementParse.size);

	var EOFMatch = matchToken("T_EOF", index);
	if(EOFMatch.type == "T_errorP") //There is code after we should be done parsing
	{
		putMessage("Error: Found extra code at "+EOFMatch.line+":"+EOFMatch.column+". Discarded");
        errorCount++;
    	errors.push(new B_error("B_Program", "Nothing", EOFMatch, 1));
	}
	
	if(verb)
	{
		if(result.type == "B_error")
			putMessage("Not a valid program");
		else
			putMessage("Program parsed with "+result.size+" tokens");
	}
	
	levelIn--;
	return result;
}

    function parseStatement(index)
    {
	levelIn++;
	if(verb)
		putMessage("Attempting to parse statement");
	    
	var result;
	    
	//Try to parse
	currToken = tokens[index];
	switch(currToken.type){
		case "T_print":
			result = parsePrintState(index);
			break;
		case "T_userId":
			result = parseIdState(index);
			break;
		case "T_type":
			result = parseVarDecl(index);
			break;
		case "T_openSBracket":
			result = parseStatementListState(index);
			break;
		default: //None of those matched
			putMessage("Error: Expected the start to a statement at " +currToken.line+ ":" +currToken.column+". Found " +currToken.type +".");
			errorCount++;
            var currError = new B_error("B_statement", "Start to a statement", matchToken("start to a statement", index), 1);
			errors.push(currError);
			result = currError;
			break;
		}
	
	
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
	
	var result;
	var startIndex = index;
	index++; //skip the P that has already been read
	
	
	var openParenMatch = matchToken("T_openParen", index);
	if(openParenMatch.type =="T_errorP")//The next token is not an open paren. Assume it's missing
	{
		putMessage("Error: Expected an open parenthesis after the print operator. Found "+openParenMatch.found.type+" at " +openParenMatch.found.line+":"+openParenMatch.found.column+"Will attempt to continue parsing");
		errorCount++;
		errors.push(new B_error("B_printState", "T_openParen", openParenMatch, 1));
	}
	else
		index++; //skip the open paren
	
	var exprParse = parseExpr(index);
	index+= exprParse.size;
	
	var closeParenMatch = matchToken("T_closeParen", index);
	index++;
	if(closeParenMatch.type =="T_errorP")//The next token is not a close paren. Look for the next close paren and throw out anything in between
	{
		putMessage("Error: Expected a close parenthesis after the statement. Found "+closeParenMatch.found.type+" at "+closeParenMatch.found.line+":"+closeParenMatch.found.column);
		errorCount++;
		errors.push(new B_error("B_printState", "T_closeParen", closeParenMatch, 1));
		
		var nextClose = findNext("T_closeParen","T_openParen",index);
		if(nextClose != -1)
		{
			putMessage("   Found a close parenthesis at "+tokens[nextClose].line+ ":"+tokens[nextClose].column+". Will resume parsing from there");
			index = nextClose+1;
		}
		else //There are no more close parens
		{
			putMessage("   Did not find a close paren for print statement. Will resume parsing from"+" at "+closeParenMatch.found.line+":"+closeParenMatch.found.column);
		}
	}
	
	result = new B_printState(index-startIndex, exprParse);
	
	if(verb)
	{
		//if(result.type == "B_error")
		//	putMessage("Not a print statement");
		//else
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
	    
	var result;
	var startIndex = index;
	var validId = false;
	    
	var idParse= parseId(index);
	index+= idParse.size;
	if(idParse.type == "B_error") // This was not a valid id
	{
		putMessage("Error: Expected a user id. Found "+idParse.found.type+"at "+idParse.found.line+":"+idParse.found.column+". Will attempt to continue parsing");
		errorCount++;
		errors.push(new B_error("B_idState", "T_userId", idParse, idParse.size));
	}
	else
		validId = true;
	var equalMatch = matchToken("T_equal", index);
	index++;
	if(equalMatch.type == "T_errorP") //Equal sign is not present
	{
		putMessage("Error: Expected an equal sign after the user id. Found "+equalMatch.found.type+"at "+equalMatch.found.line+":"+equalMatch.found.column);
		errorCount++;
		errors.push(new B_error("B_printState", "T_closeParen", equalMatch, 1));
		
		/*var nextEqual = findNext("T_equal","",index);
		if(nextEqual != -1)
		{
			putMessage("   Found an equal sign at "+tokens[nextEqual].line+ ":"+tokens[nextEqual].column+". Will resume parsing from there");
			index = nextEqual+1;
		}
		else //There are no more equal signs
		{
			putMessage("   Did not find an equal sign for the variable assignment. Will assume equal sign was forgotten");
		}*/
	}
	
	var exprParse = parseExpr(index);
	index+= exprParse.size;
	if(exprParse.type == "B_error")//This is not a valid expr
	{
		putMessage("Error: Expected an expression on the other side of the equal sign. Found "+exprParse.found.type+"at "+exprParse.found.line+":"+exprParse.found.column+". Will attempt to continue parsing");
		errorCount++;
		errors.push(new B_error("B_idState", "B_expr", exprParse, exprParse.size));
	}
	else if(validId) //There is a valid id and expr, attempt to go through with the assignment
	{
		var ident = idParse.idT.inside;
		var value = exprParse;
		if(symTable.hasItem(ident))
		{
			var existingVar = symTable.getItem(ident); //Retrieve the existing symbol defition to not overwrite it
			existingVar.value = value; //Set the new value
			symTable.setItem(ident, existingVar); //Put the symbol back in the table
		}
		else //This is a previously unseen variable, cannot be assigned until it is declared
		{
			putMessage("Found undeclared variable assignment at " + idParse.idT.line +":" +idParse.idT.column);
			errors.push(new B_error("B_idState", "Declared user id", new T_errorP("declared user id", idParse.idT), idParse.size));
			errorCount++;
			//var newVar = new variable(undefined, value);
			//symTable.setItem(ident, newVar); //Put the new symbol back in the table
		}
	}
	
	result = (new B_idState(index-startIndex,
							idParse,
							exprParse));
	
	if(verb)
	{
		//if(result.type == "B_error")
		//	putMessage("Not an id assignment statement");
		//else
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
    
	var result;
	var startIndex = index;
	var validId = false;
	    
	    
	var typeMatch = matchToken("T_type", index);
	index++;
	if(typeMatch.type == "T_errorP")
	{
		putMessage("Error: Expected a var type. Found "+typeMatch.found.type+"at "+typeMatch.found.line+":"+typeMatch.found.column+". Will attempt to continue parsing");
		errorCount++;
		errors.push(new B_error("B_varDecl", "T_type", typeMatch, typeMatch.size));
	}
	else
		validId = true;
		
	var idParse = parseId( index);
	index+= idParse.size;
	if(idParse.type == "B_error") // This was not a valid id
	{
		putMessage("Error: Expected a user id. Found "+idParse.found.type+"at "+idParse.found.line+":"+idParse.found.column+". Will attempt to continue parsing");
		errorCount++;
		errors.push(new B_error("B_varDecl", "T_userId", idParse, idParse.size));
	}
	else if(validId) // this is a valid variable declaration. Add to the symbol table
	{
		var ident = idParse.idT.inside;
		var type = typeMatch.inside;
			
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
	}
			
	result = (new B_varDecl(index-startIndex,
						typeMatch,
						idParse));
	
	if(verb)
	{
		//if(result.type == "B_error")
		//	putMessage("Not a variable declaration");
		//else
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
	    
	var result;
	var startIndex = index;
	index++; //skip the open squiggly bracket that has already been read
	var nextClose = findNext("T_closeSBracket","T_openSBracket",index);
	    
	var statementListParse;
	if(nextClose != -1)
	{
		statementListParse = parseStatementList(index, nextClose);
		index+= statementListParse.size;
        index++; //For the close SBracket
	}
	else //There are no more close Sbrackets
	{
		putMessage("Error: Did not find a close Sbracket for statement list. Will assume it was forgotten");
		statementListParse = parseStatementList(index, tokens.length-2); //Treat the rest of the program as a statementlist except for the EOF token
		index+= statementListParse.size;
		errorCount++;
		errors.push(new B_error("B_statementListState", "T_closeSBracket", tokens[index], 1));
	}
		
	statementListParse.size = (index-startIndex);
	result = statementListParse;
			
	if(verb)
	{
		//if(result.type == "B_error")
		//	putMessage("Not a statement list statement");
		//else
			putMessage("Statement list statement parsed");
	}
	    
	levelIn--
	return result;
    }

function parseStatementList(index, end)
    {
	levelIn++;
	if(verb)
		putMessage("Attempting to parse statement list");
	    
	var result;
	var startIndex = index;
	
	if(index != end) //The list hasn't been fully parsed
	{
		if(verb)
			putMessage("List is not empty");
		
		var statementParse = parseStatement(index);
		index+= statementParse.size;
		/*if(statementParse.type == "B_error")// This code is not a statement. Try to parse the rest of the list
		{
			putMessage("Error: Expected a statement as part of a statement list. Found "+statementParse.found.type+" at "+statementParse.found.line+":"+statementParse.found.column);
			errorCount++;
			errors.push(new B_error("B_statementList", "B_statement", statementParse, statementParse.size));
		}*/
		
		var statementListParse = parseStatementList(index, end);
		index+= statementListParse.size;
		if(statementListParse.type == "B_error") //This is not a valid statement list. Leave this reccursive madness!
		{
			result = new B_error("B_statementList", "B_statementList", statementListParse, statementListParse.size);
		}
		else //The recursion gives us something valid
			result = (new B_statementList(index-startIndex,
									statementParse,
									statementListParse));
	}
    else //We've reached the end of the list
        result = (new B_statementList(0,"",""));
	
	if(verb)
	{
		//if(result.type == "B_error")
		//	putMessage("Not a statement list");
		//else
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
	var result;
	    
	//Try to parse
	currToken = tokens[index];
	switch(currToken.type){
		case "T_digit":
			result = parseIntExpr(index);
			break;
		case "T_qoute":
			result = parseCharExpr(index);
			break;
		case "T_userId":
			result = parseId(index);
			break;
		default: //None of those matched
			putMessage("Error: Expected the start to an expr at " +currToken.line+ ":" +currToken.column+". Found " +currToken.type +".")
			errorCount++;
            var currError = new B_error("B_expr", "Start to an expr ", matchToken("start to an expr", index), 1)
			errors.push(currError);
			result = currError;
			break;
	}
	
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
	
	var result;
	var startIndex = index;
	
	var digitMatch = matchToken("T_digit",index);
	index++;
	var opMatch = matchToken("_op", index);
	index++;
	    
	if(digitMatch.type == "T_errorP") //Found something other than a digit. Skip
	{
		putMessage("Error: Expected a digit as part of an int expression. Found "+digitMatch.found.type+" at "+digitMatche.found.line+":"+digitMatch.found.column+". Will skip");
		errorCount++;
		errors.push(new B_error("B_intExpr", "T_digit", digitMatch, digitMatch.size));
		result = parseIntExpr(index+1);
	}
	else if(opMatch.type != "T_errorP")//found a digit with an operator
	{
		var exprParse = parseExpr(index);
		index+= exprParse.size;
		if(exprParse.type == "B_error")//This is not a valid expr
		{
			putMessage("Error: Expected an expression on the other side of the operator. Found "+exprParse.found.type+"at "+exprParse.found.line+":"+exprParse.found.column+". Will attempt to continue parsing");
			errorCount++;
			errors.push(new B_error("B_intExprWOp", "B_expr", exprParse, exprParse.size));
		}
		result = (new B_intExprWOp(index-startIndex,
									digitMatch,
									opMatch,
									exprParse));
	}
	else //Found a digit with no operator following it
	{
		result = (new B_intExpr(1,digitMatch));
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
    
    
    function parseCharExpr(index)
    {
	levelIn++;
	if(verb)
		putMessage("Attempting to parse char expression");
    
	var result;
	var startIndex = index;
	index++; //skip the open qoute that has already been read
	    
	var nextQoute = findNext("T_qoute","", index);
	var charExprParse;
	if(nextQoute != -1)
	{
		charExprParse = parseCharList(index, nextQoute);
		index+= charExprParse.size;
        index++; //For the close qoute
	}
	else //There are no more qoutes
	{
		putMessage("Error: Did not find a close qoute for char list. Will assume it was forgotten");
		charExprParse = parseCharList(index, tokens.length-2); //Treat the rest of the program as a char list except for the EOF token
		index+= charExprParse.size;
		errorCount++;
		errors.push(new B_error("B_charExpr", "T_qoute", tokens[index], 1));
	}
		
	charExprParse.size = (index-startIndex);
	result = charExprParse;
			
	if(verb)
	{
		//if(result.type == "B_error")
		//	putMessage("Not a statement list statement");
		//else
			putMessage("Char Expression parsed");
	}
	    
	levelIn--
	return result;
    }
    
    
function parseCharList(index, end)
    {
	levelIn++;
	if(verb)
		putMessage("Attempting to parse char list");
    
	var result;
	var startIndex = index;

	if(index != end) //The list hasn't been fully parsed
	{
		if(verb)
			putMessage("List is not empty");
		
		var charMatch = matchToken("T_char", index);
		index++;
		if(charMatch.type == "T_errorP")// This is not a valid char. Try to parse the rest of the list
		{
			putMessage("Error: Expected a char as part of a char list. Found "+charMatch.found.type+" at "+charMatch.found.line+":"+charMatch.found.column);
			errorCount++;
			errors.push(new B_error("B_charList", "T_char", charMatch, charMatch.size));
		}
		
		var charListParse = parseCharList(index, end);
		index+= charListParse.size;
		if(charListParse.type == "B_error") //This is not a valid statement list. Leave this reccursive madness!
		{
			result = new B_error("B_charList", "B_charList", charListParse, charListParse.size);
		}
		else //The recursion gives us something valid
			result = (new B_charList(index-startIndex,
									charMatch,
									charListParse));
	}
    else //We've reached the end of the list
	    result = (new B_charList(0,"",""));
        
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
	    
	var result;
	var charMatch = matchToken("T_userId", index);
	if(charMatch.type != "T_errorP") // This is a valid type
		result = new B_id(1, charMatch);
	else //Not a match
		result =new B_error("B_id", "T_userId", charMatch, 1);

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

   
//Utilities
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
		var operationRege = /T_plus|sub/;
		switch(type)
		{
		case "_op":   
			if(operationRege.test(token.type))
            {
				result = token;
            }
            else
				result = new T_errorP(type, token);
			    break;
		default:        
				result = new T_errorP(type, token);
				break;	
			}
	}
	
	levelIn--;
	return result;
    }
    
    function findNext(searchType, nestingType, index)
    {
	var location = -1;
    var nestlevel = 0;
	var i = index;
	while(i<tokens.length && location ==-1)
	{
		if(tokens[i].type == nestingType)
    	{
			nestlevel++;
		}
        if(tokens[i].type == searchType)
		{
            if(nestlevel > 0) //This is not the matching pair
                nestlevel--;
            else
			    location = i;
		}
		i++;
	}
    
    return location;
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
   
function B_error(step, expected, found, size)
   {
	this.step = step
	this.expected = expected;
	this.found = found;
	this.size = size;
    this.line = found.line;
    this.column = found.column
	this.type ="B_error";
    this.base = found.base
   }
    
    
//Parse Error Token
function T_errorP(expected, found)
   {
	this.type ="T_errorP";
	this.depth = 0;
	this.expected = expected;
	this.found = found;
    this.line = found.line;
    this.column = found.column;
    this.base = found;
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
	   
	if(/userId|type|digit|char/.test(root))//This is one of the tokens with extra information
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
    var returnText ="";
	
	returnText +="Symbol Table:\n";
	returnText +="Identifier |Type        |Value\n";
	
	for(var i=0;i<identifiers.length;i++){
			returnText +=""+identifiers[i] + "           "+ varObjs[i].type +"     " +varObjs[i].value.type+"\n";
	}
    putMessage(returnText);
}
	
function errorHandler()
{
	putMessage("Error List:");
	
	for(var i=0;i<errors.length;i++){
        var currError =errors[i];
        if(/userId|type|digit|char/.test(currError.base.type))//This is one of the tokens with extra information
    	    putMessage("At "+currError.line+":"+currError.column + " Expected: "+ currError.expected +". Found: " +currError.base.inside);
        else
		    putMessage("At "+currError.line+":"+currError.column + " Expected: "+ currError.expected +". Found: " +currError.base.type);
	}
}	
/*function errorHandler()
{
	putMessage("\nError Tree: ");
	var bottom = errorHandlerHelper(tree, 0);;
}

function errorHandlerHelper(tree, indent)
{
	if(tree.type == "T_errorP")
		return tree;
	else
	{
		var branch = "";
		for(var i=0;i<indent;i++)
			branch += "  ";
		branch += tree.step;
		putMessage(branch);
		return errorHandlerHelper(tree.block, indent+1);
	}
}*/

/*
function parseIntExprWOp(index)
    {
	levelIn++;
	if(verb)
		putMessage("Attempting to parse int expression with an operator");
	    
	var result;
	var errorDepth = 0;
	var startIndex = index;
	    
	var digitMatch = matchToken("T_digit", index);
	index++;
	if(digitMatch.type != "T_errorP")
	{
		errorDepth++;
		var opMatch = matchToken("_op", index);
		index++;
		if(opMatch.type != "T_errorP")
		{
			errorDepth++;
			var exprParse = parseExpr(index);
			index+= exprParse.size;
			if(exprParse.type != "B_error") //There is a working int expression with operator match
			{
				result = (new B_intExprWOp(index-startIndex,
									digitMatch,
									opMatch,
									exprParse));
			}
			else //Not a match
				result =new B_error("B_intExprWOp", exprParse, errorDepth);
		}
		else //Not a match
			result =new B_error("B_intExprWOp", opMatch, errorDepth);
	}
	else //Not a match
		result =new B_error("B_intExprWOp", digitMatch, errorDepth);

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
    */
	