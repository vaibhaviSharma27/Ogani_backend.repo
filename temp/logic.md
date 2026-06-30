1.--> we send login details like email and password to the backend like its saved in backend.

2.--> now backend verifies the details through userId and gives us a token through which cookies are automatically stored in local storage.

3.--> Its advantage is that whenever page is reloaded or a task is initiated the local storage has cookies with saved credentials of user thus verification of the actual user is made through it without asking the users for every task initiated or page reloading.

4.--> Thus, preventing bad user experience.  


------------------------------------------------------

1.--> FOR MAKING A CONTACT PAGE

-- make a file in backend for linking to contact page.
-- then information taken from req.body then email sent to both parties accordingly.
-- then linking backend to frontend.

---------------------------------------------------------

# WHAT IS A MIDDLEWARE FUNCTION??
-- A middleware in express is a function that runs between receiving a request and sending a response.

REQUEST--> MIDDLEWARE--> ROUTE HANDLER--> RESPONSE

req - request data
res - response object
next() - passes control to the next middleware or route.

# WHY USE A MIDDLWEWARE?
-- AUTHENTICATION: Check if the user is logged in.
-- LOGGING: RECORDS INCOMING REQUESTS.
--PARSING JSON: This is actuall middleware provided by express without this req.body will be undefined for JSON requests.

-- Similarly, if you want protected routes, so only logged in users can access this route or url.
-- if checkAuth is not used thus anyone can access it  even the non-logged in users.

A simple way to think about it:

Routes → do the main work.
Middleware → perform checks or preparation before the main work.

So middleware is optional, but in real applications you'll almost always use some middleware such as:
app.use(express.json()); // Parse JSON
app.use(cors());         // Allow frontend requests
app.use(checkAuth);      // Authentication

# what happens if you don't call next()?
The request gets stuck because Express doesn't know what to do next.
--
You must either use next(); orsend a response like res.send("Done");

-- Each Middleware gets a chance to inspect or modify the request before it reaches the final route handler. That's why middleware is often called the "middle layer" between the request and the response.

# ALSO, Why use checkAuth?
We use checkAuth when we want only authenticated users to access certain routes.

EXAMPLE----- Imagine building a todo App.

-- Without checkAuth--> 

app.get("/tasks", (req, res) => {
  // return tasks
});

Anyone who knows the URL can access our route.

-- With checkAuth--> 

app.get("/tasks", checkAuth, (req, res)=>{
    // return tasks
});

Now Express does:

Request
   ↓
checkAuth -- Token is sent...
   ↓
Route Handler

If the user has a valid token-- next();--- and the route runs.

If the token is missing or invalid-- res.status(401).json({message:"Unauthorized User!!});--- and the route never runs..

For example, suppose you have login functionality:
POST /login

After successful login, the user gets a JWT token.

Then when they request:
GET /tasks

they send: Authorization: Bearer <token>

checkAuth verifies that token before giving them tasks.
if verification successfull then task is initiated otherwise rejected

-------------------------------------------------------------------------

# DEBOUNCING METHOD

-- Taking search bar as an example, 

WITHOUT DEBOUNCING =>

const input = document.querySelector("input");

input.addEventListener("input", (e) => {
   console.log("Searching for:", e.target.value);
});

WHAT HAPPENS?
user types:                         Output:

h                                    Searching for: h
he                                   Searching for: he
hel                                  Searching for: hel
hell                                 Searching for: hell
hello                                Searching for: hello

if this were calling an API, it would make 5 API requests.

WITH DEBOUNCING:

const input = document.querySelector("input");

let id;

input.addEventListener("input", (e) => {

   if(id){
      clearTimeout(id);
   }

   id = setTimeout(()=>{
      console.log("Searching for:" , e.target.value);
   },1000);
});

WHEN USER TYPES : h
new timer starts  -- setTimeout(()=>{
      console.log("Searching for:" , "h");
   },1000);

   within 1 second (maybe in 300ms);
   USER TYPES: he

   old  timer is killed (clearTimeout(id))---- new one registered for one second
   setTimeout(()=>{
      console.log("Searching for:" , "he");
   },1000);

   similarly,within 1 second (maybe in 200ms);
   USER TYPES: hel
   old timer is again killed (clearTimeout(id))--- new one registered
   setTimeout(()=>{
      console.log("Searching for:" , "hel");
   },1000);

   This keeps happening until: hello 

   When user stops Typing:
   No more events occur..

   After 1 second: console.log("Searching for:" , "hello");
   OUTPUT: searching for: hello -----> Only one API call happens.

   Meaning-- "Wait until user finishes typing, then search."


   WHAT IS ADVANTAGE OF THIS??? 
   --ONLY ONE API CALL IS RENDERED FOR SEARCHING HELLO AND NOT 5 API CALLS FOR EACH LETTER.--
   -- Prevents messy console.log--

   ---------------------------------------------------------------------

   # THROTTLING METHOD

   let canSearch = true;
   const input = document.querySelector("input");

   input.addEventListener("input", (e) => {

      if(!canSearch) return;

      console.log("Searching:" , e.target.value);

      canSearch = false;

      setTimeout(() => {
         canSearch = true;
      }, 1000)
   });

   User Types: "h"
  Since, canSearch== true

console.log("Searching: h");---> this function happens...

OUTPUT>> searching: h

Then---> canSearch= false;

Now, user types "he",
 Since ,if (!canSearch) return; as canSearch = false

 therefore, NOTHING HAPPENS...

 Before 1 second----

 User types "hel"
 or 
 user types "hell" 
 NOTHING HAPPENS --- as canSearch is still false

 After 1 second ,
 canSearch = true

 Now , User types again 
 Now search runs again.
 OUTPUT:
 Searching: hello

 Searching occurs after throttle stops or when timer stops and doesn't depends on user typing whether user types or not the search happens when timer stops 

 --- But But, This type of function is  not efficient for search bars like events as we want search to function as per typing of user or as per user request thus DEBOUNCING METHOD is what mostly used and is efficient too...

 THEN WHAT IS THE ADVANTAGE OF THROTTLING??

 some events happen continously, and still you want updates while they're happening.

 EXAMPLE: SCROLL EVENT--
 Imagine you're building a website and want to show:

 Scrolled: 100px
 Scrolled: 200px
 Scrolled: 300px
...

WITHOUT THROTTLING:
window.addEventListener("scroll", () => {
   console.log(window.scrollY);
});

While scrolling, this can run hundreds of times per second:
10
12
15
18
21
25
...
This can hurt performance.

WITH DEBOUNCING
let id;
window.addEventListener("scroll", ()=> {
  if(id) clearTimeout(id);

  id = setTimeout (() => {
   console.log(window.scrollY);
  },1000);

});

Now it only runs after the user stops scrolling,
User scrolling...
User scrolling...
User scrolling...

(stops)

Scrolled: 1000

Problem:

❌ You don't get updates while scrolling.

WITH THROTTLING:
let canRun = true;

window.addEventListener("scroll", () =>{
   if(!canRun) return;

   console.log(window.scrollY);

   canRun = false;

   setTimeout(() => {
      canRun = true;
   }, 100);

});

OUTPUT:
100
250
400
550
700
850
1000

✅ Fewer function calls
✅ Still gets updates during scrolling

-- create cart item if the item with that particular id is not existing in the db.
-- if the item exists increase its quantity by one 
-- otherwise decrease its quantity (when "-" button clicked) and if quantity = 0 delete the cart item  

--- checkAuth=> user._id=> access to the cart => when proceed to checkout => total cost calculated from total items in cart=> items saved in backend for orders => order._id generated accordingly => 