
//CHECKING IF ADMIN IS NOT AUTHENTICATED WONT ALLOW YOU TO VISIT DASHBOARD IF YOU'RE NOT LOGIN
function checkAuthenticated(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect('/backend/adminlogin');
}

//if admin is authenticated you cant go out till you sign out
function checkNotAuthenticated(req, res,next){
    if(req.isAuthenticated()){
        return res.redirect('/backend/dashboard')
    }
    //keeps inside dashboard
   next()
}


module.exports = {
    checkAuthenticated,
    checkNotAuthenticated,
};
