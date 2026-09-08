

const{create,login}= require("../controller/registercontroller");
const express = require("express");
const router =express.Router();
router.post("/create",create);
router.post("/login",login);

module.exports=router;