import {Router} from "express";
import Medicine,{SAMPLE_TYPES,DIVISIONS,WORKFLOW_STAGES} from "../models/Medicine.js";
import {protect,adminOnly} from "../middleware/auth.js";
import {getExpiryStatus} from "../utils/expiry.js";
const router=Router();router.use(protect);
const populated=[{path:"createdBy",select:"name email"},{path:"lastEditedBy",select:"name email"},{path:"workflow.updatedBy",select:"name email"},{path:"editHistory.editedBy",select:"name email"}];

const LEGACY_STAGE_MAP={
  "Sample Received":"received at LAB",
  "Sample Distribute":"Receoved at Division",
  "Received Sample Division":"Distribuled to Analyst",
  "Distribute":"Distribuled to Analyst",
  "Analysis":"Test Progress",
  "Submit":"Submitted after Analysis",
  "Checking":"Given to check",
  "Submit After Check":"Submitted after Repeat",
  "Ready for Typing":"Awaiting reports / letters",
  "Draft Typing":"Sent to draft",
  "Checked by Division":"Sent to Division",
  "Checked by Technical":"Sent to TU (Technical unit)",
  "Final Typing":"check & Final Print",
  "Director's Sign":"Final Signature",
  "Checked by Technical and Director Sign":"Final Signature"
};

function normalizeWorkflow(medicine){
  const existing=new Map();
  for(const item of medicine.workflow||[]){
    const stage=LEGACY_STAGE_MAP[item.stage]||item.stage;
    if(WORKFLOW_STAGES.includes(stage)&&!existing.has(stage))existing.set(stage,item);
  }
  medicine.workflow=WORKFLOW_STAGES.map(stage=>existing.has(stage)?{
    stage,
    details:existing.get(stage).details||"",
    completed:Boolean(existing.get(stage).completed),
    updatedBy:existing.get(stage).updatedBy,
    updatedAt:existing.get(stage).updatedAt
  }:{stage,details:"",completed:false});
}
function validate(b){if(!b.lrNumber?.trim()||!b.genericName?.trim()||!b.batchNumber?.trim()||!b.receivedDate||!b.expiryDate||!SAMPLE_TYPES.includes(b.sampleType)||!DIVISIONS.includes(b.division))return "LR number, generic name, batch number, received date, expiry date, sample type and division are required.";if(Number(b.quantity??0)<0)return "Quantity cannot be negative.";return null;}
router.get("/",async(req,res,next)=>{try{const {search="",sampleType="",division="",expiry=""}=req.query;const f={};if(SAMPLE_TYPES.includes(sampleType))f.sampleType=sampleType;if(DIVISIONS.includes(division))f.division=division;if(search)f.$or=["lrNumber","genericName","batchNumber","coaNumber","manufacturer"].map(k=>({[k]:{ $regex:search,$options:"i"}}));let rows=await Medicine.find(f).populate(populated).sort({expiryDate:1,receivedDate:-1});if(expiry==="attention")rows=rows.filter(m=>getExpiryStatus(m.expiryDate).daysRemaining<=90);rows.forEach(normalizeWorkflow);res.json(rows.map(m=>({...m.toObject(),expiry:getExpiryStatus(m.expiryDate)})));}catch(e){next(e);}});
router.get("/summary",async(_req,res,next)=>{try{const rows=await Medicine.find();const s={total:rows.length,expired:0,within30:0,within90:0};rows.forEach(m=>{const d=getExpiryStatus(m.expiryDate).daysRemaining;if(d<0)s.expired++;else if(d<=30)s.within30++;else if(d<=90)s.within90++;});res.json(s);}catch(e){next(e);}});
router.post("/",adminOnly,async(req,res,next)=>{try{const err=validate(req.body);if(err)return res.status(400).json({message:err});const m=await Medicine.create({...req.body,lrNumber:req.body.lrNumber.trim().toUpperCase(),createdBy:req.user._id,lastEditedBy:req.user._id});await m.populate(populated);res.status(201).json({...m.toObject(),expiry:getExpiryStatus(m.expiryDate)});}catch(e){if(e.code===11000)return res.status(409).json({message:"This LR number already exists. LR numbers must be unique."});next(e);}});
router.put("/:id",adminOnly,async(req,res,next)=>{try{const err=validate(req.body);if(err)return res.status(400).json({message:err});const m=await Medicine.findByIdAndUpdate(req.params.id,{...req.body,lrNumber:req.body.lrNumber.trim().toUpperCase(),lastEditedBy:req.user._id,lastEditedAt:new Date()},{new:true,runValidators:true}).populate(populated);if(!m)return res.status(404).json({message:"Medicine not found."});res.json({...m.toObject(),expiry:getExpiryStatus(m.expiryDate)});}catch(e){if(e.code===11000)return res.status(409).json({message:"This LR number already exists."});next(e);}});
// Every authenticated user can update the shared workflow for any medicine.
router.patch("/:id/workflow",async(req,res,next)=>{try{const {stage,details="",completed=false}=req.body;if(!WORKFLOW_STAGES.includes(stage))return res.status(400).json({message:"Unknown workflow stage."});if(typeof details!=="string"||details.length>3000)return res.status(400).json({message:"Details must be 3000 characters or fewer."});const m=await Medicine.findById(req.params.id);if(!m)return res.status(404).json({message:"Medicine not found."});normalizeWorkflow(m);let item=m.workflow.find(x=>x.stage===stage);if(!item){m.workflow.push({stage,details,completed,updatedBy:req.user._id,updatedAt:new Date()});}else{m.editHistory.push({stage,previousDetails:item.details||"",newDetails:details,editedBy:req.user._id,editedAt:new Date()});item.details=details;item.completed=Boolean(completed);item.updatedBy=req.user._id;item.updatedAt=new Date();}m.lastEditedBy=req.user._id;m.lastEditedAt=new Date();await m.save();await m.populate(populated);res.json({...m.toObject(),expiry:getExpiryStatus(m.expiryDate)});}catch(e){next(e);}});
router.delete("/:id",adminOnly,async(req,res,next)=>{try{const m=await Medicine.findByIdAndDelete(req.params.id);if(!m)return res.status(404).json({message:"Medicine not found."});res.json({message:"Medicine deleted."});}catch(e){next(e);}});
export default router;
