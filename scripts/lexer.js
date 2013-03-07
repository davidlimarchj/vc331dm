    /* lexer.js  */

	var verb;
	var tokens;
	var errorCount;
	var foundEOF;
	
	function lex(verbose)
	    {
		//Initialize global vars
		tokens = new Array();
		errorCount =0;
		foundEOF = false;
		    
		levelIn++;
		putMessage("Entered Lex");
		 //Activate or deactive verbose mode
		verb = verbose
		// Grab the "raw" source code.
		var sourceCode = document.getElementById("taSourceCode").value;
		    if(verb)
			putMessage("Retrieved Source Code");
		
		var tokens = scannerTokenizer(sourceCode);
		if(verb)
			putMessage("Source Code Tokenized");
		putMessage("Lex Error Count: " + errorCount);
		
		levelIn--;
		var lexReturnText = "Lex returned [";
        
		for(var i=0;i<tokens.length;i++)
		{
			lexReturnText += "[" + tokens[i].type + "]";
		}
		lexReturnText += "]\n";
		putMessage(lexReturnText);    
		
		return tokens;
	    }

		function scannerTokenizer(str)
		{
			
			levelIn++;
			
			var arr = str.split("");
			var tokenList = new Array();
			var identifierList = new Array();
			var inQoutes = false;
			var line = 0; //Tracks line number
			var column = 0; //Tracks column number
			
			//The Regular Expressions we will be searching for
			var symbolRege = /[\+\-\(\)\{\}\"P=$]/;
			var wsRege = /\s/;
			var charRege = /[a-z]/;
			var digitRege = /[0-9]/;
			
			tokenList.push(new T_BOF());
			var i = 0;
			
			while((i<arr.length && !foundEOF))
			{
					//var offset = 0;
					if(arr[i] == "\n")
					    {
						line++;
						column = 0;
					    }
					if(verb)
					{
                        putMessage("At " + line + ":"+ column);
						putMessage("Starting Lex Analysis of: " + arr[i]);
					}
					if(!inQoutes) //Not currently in between qoutation mark
					{
						if(verb)
							putMessage("Not in qoutes");
						if (wsRege.test(arr[i])) //Whitespace
						{
							if(verb)
								putMessage("Encountered whitespace");	
								column++;
						}
						else if(symbolRege.test(arr[i])) //Acceptable Symbols
						{
							if(verb)
								putMessage("Encountered Symbol");
							if(arr[i] == '"') //Open qoute, toggle flag
								inQoutes = true;
						    tokenList.push(symbolAnalysis(arr[i], line, column));
						    column++;
						}
						else if(charRege.test(arr[i])) //Identifiers
						{
							if(verb)
								putMessage("Found identifier");
							//find where the next whitespace is to delimite the identifier
							identLen = str.substring(i).search(new RegExp (wsRege.source + "|" + symbolRege.source));
							if(identLen == -1)
							{
								tokenList.push(identifierAnalysis(str.substring(i), line, column)); //End of file
								identLen = str.length - i;
							}
							else
							{
								tokenList.push(identifierAnalysis(str.substring(i, i+identLen), line, column));
							}
							i += identLen-1; //move the scanner index ahead by the length of the identifier
							column = column + identLen;
											
						}
						else if(digitRege.test(arr[i])) //Digits's
						{
							if(verb)
								putMessage("Found digit");
							tokenList.push(new T_digit(arr[i], line, column));
							column++;
							onWhiteSpace = false;
						}
						else
						{
							if(verb)
								putMessage("Unidentified input " + arr[i] + " on " + line + ":" + column );
							tokenList.push(new T_error(arr[i], line, column));
							errorCount++;
							column++;
						}
				    }
				    else //Current in between qoutation marks
				    {
					    if(verb)
						putMessage("In between qoutes");
					if(arr[i] == '"') //Close Qoute
					{
						if(verb)
						putMessage("Found close qoutes");
					    tokenList.push(new T_qoute(line, column));
					    inQoutes = false;
					    column++;
					}
					else if( charRege.test(arr[i])) //Chars
					{
						if(verb)
							putMessage("Found char in qoutes");
					tokenList.push(new T_char(arr[i],line, column));
					column++;
					}
					else //Error
					{
						if(verb)
							putMessage("Found a non char in between qoutes");
						tokenList.push(new T_error(arr[i],line, column));
						column++;
					}
				}
			    
			    i++;
			}
			
			if(!foundEOF)
			{
				putMessage("Warning: Expected a dollar sign at the end of the program. Added for you");
				tokenList.push(new T_EOF(line, column));
			}
			else if(i < arr.length)
			{
				putMessage("Warning: Found code after the dollar sign. Ignored.");
			}
			
			levelIn--;
			return tokenList;
		}
		

function symbolAnalysis(input, line, column)
    {
        if(input == "P") //Print operator
            return new T_print(line, column);
	else if(input == "=") //Equal operator
            return new T_equal(line, column);
	else if(input == "+") //Plus operator
            return new T_plus(line, column);
        else if(input == "-") //Sub operator
            return new T_sub(line, column);
        else if(input == "(") //Open Parenthesis
            return new T_openParen(line, column);
        else if(input == ")") //Close Parenthesis
            return new T_closeParen(line, column);
        else if(input == "{") //Open Squiggly Brace
            return new T_openSBracket(line, column);
        else if(input == "}") //Close Squiggly Brace
            return new T_closeSBracket(line, column);
	else if(input == "$") //Dollar Sign (End of program symbol)
            return new T_EOF(line, column);
	else if(input == '"') //Qoute
            return new T_qoute(line, column);
        else //Error Case
        {
            putMessage("Unidentified charcter found on " + line + ":" + column );
            return new T_error(input, line, column);
        }
    }
		
		
    function identifierAnalysis(str, line, column)
    {

	if(str.length == 1)
		return new T_userId(str, line, column);
	else
	{
		switch (str) {
			case "char":
				return new T_type(str, line, column);
				break;
			case "int":
				return new T_type(str, line, column);
				break;
			default:
				putMessage("Unidentified indentifier found on " + line + ":" + column +". User identifiers can only be one char long");
				return new T_error(str, line, column);
				break;
		}
	}
   }

		
		
		
		
		
		
	 //Token Definitions
function T_print(line, column)
   {
	this.type ="T_print";
	this.line = line;
	this.column = column;
	   if(verb)
		putMessage("Print Token Created");
   }
   
   function T_equal(line, column)
   {
	this.type ="T_equal";
	this.line = line;
	this.column = column;
	   if(verb)
		putMessage("Equal Token Created");
   }
   
   function T_qoute(line, column)
   {
	   this.type ="T_qoute";
	this.line = line.toString();
	this.column = column.toString();
	if(verb)
		putMessage("Qoute Token Created");
   }
   
   function T_plus(line, column)
   {
	   this.type ="T_plus";
	this.line = line;
	this.column = column;
	   if(verb)
		putMessage("Plus Token Created");
   }

   function T_sub(line, column)
   {
       this.type ="T_sub";
	this.line = line;
	this.column = column;
	   if(verb)
		putMessage("Subtraction Token Created");
   }
   
   function T_openParen(line, column)
   {
	   this.type ="T_openParen";
	this.line = line;
	this.column = column;
	   if(verb)
		putMessage("Open Parenthesis Token Created");
   }
   
   function T_closeParen(line, column)
   {
	   this.type ="T_closeParen";
	this.line = line;
	this.column = column;
	   if(verb)
		putMessage("Close Parenthesis Token Created");
   }
   
   function T_openSBracket(line, column)
   {
	   this.type ="T_openSBracket";
	this.line = line;
	this.column = column;
	   if(verb)
		putMessage("Open Squiggly Bracket Token Created");
   }
   
   function T_closeSBracket(line, column)
   {
	   this.type ="T_closeSBracket";
	this.line = line;
	this.column = column;
	   if(verb)
		putMessage("Close Squiggly Bracket Token Created");
   }
   
   
    function T_userId(str, line, column)
   {
	   this.type ="T_userId";
	   this.inside = str;
	this.line = line;
	this.column = column;
	   if(verb)
		putMessage("User Id Token Created with value " + str);
   }
   
   function T_type(str, line, column)
   {
	   this.type ="T_type";
	   this.inside = str
	this.line = line;
	this.column = column;
	   if(verb)
		putMessage("Variable Type Token Created");
   }
      
   
    function T_digit(ident, line, column)
   {
	this.type ="T_digit";
	   this.inside = ident;
	this.line = line;
	this.column = column;
	   if(verb)
		putMessage("Digit Token Created with value " + ident);
   }
   
    function T_char(ident, line, column)
   {
	this.type ="T_char";
	this.inside = ident;
	this.line = line;
	this.column = column;
	   if(verb)
		putMessage("Char Token Created with value " + ident);
   }
   
       function T_BOF()
   {
	   this.type ="T_BOF";
	   if(verb)
		putMessage("Beginning of File Token Created");
   }
   
       function T_EOF(line, column)
   {
	this.type ="T_EOF";
	this.line = line;
	this.column = column;
	foundEOF = true;
	if(verb)
		putMessage("End of File Token Created");
   }
   
    function T_error(ident,line, column)
   {
	this.type ="T_error";
	this.inside = ident;
	this.line = line;
	this.column = column;
	   errorCount++;
	if(verb)
		putMessage("Error Token Created");
   }
   