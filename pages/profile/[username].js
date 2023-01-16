import { Typography, TextField, Button, IconButton, Link, Divider } from "@mui/material";
import Avatar from "@mui/material/Avatar";
import styles from "./Profile.module.css";
import Paper from "@mui/material/Paper";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setState as setToken } from "../../store/token.js";
import EditIcon from "@mui/icons-material/Edit";
import EditOffIcon from "@mui/icons-material/EditOff";
import GoogleIcon from "@mui/icons-material/Google";
import LogoutIcon from "@mui/icons-material/Logout";
import CancelIcon from "@mui/icons-material/Cancel";
import DeleteIcon from "@mui/icons-material/Delete";
import CircularProgress from "@mui/material/CircularProgress";
import SadFace from "@mui/icons-material/SentimentVeryDissatisfied";
import RecipeCard from "../recipebooks/components/RecipeCard";
import {
  validateField,
  modify,
  upgradePlan,
  logOutGoogle,
  deleteAccount,
  fetchData,
} from "../../api/profileApi";
import { deleteRecipe } from "../../api/recipeApi";
import { setState as isUserGoogleLogin } from "../../store/googleLogin";

import UploadImage from "../../components/UploadImage.js";
import Plans from "../../components/Plans.js";

export default function Profile() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { username } = router.query;
  const decodedToken = useSelector((state) => state.token);
  const tokenUsername = decodedToken?.username;
  const isGoogleLogin = useSelector((state) => state.googleLogin.isLogged);
  const [data, setData] = useState(null);
  const [recipes, setRecipes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingButton, setLoadingButton] = useState(false);
  const [openGoogleModal, setOpenGoogleModal] = useState(false);
  const [edit, setEdit] = useState(false);
  const [error, setError] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
    birthDate: "",
    cellPhone: "",
  });

  useEffect(() => {
    if (!edit) {
      fetchData(`/api/v1/accounts/${username}`, setData, setLoading);
      fetchData(`/api/v1/recipes`, (data) => setRecipes(data.filter(r => r.createdBy === username)), setLoading);
    }
  }, [edit]);

  const logoutGoogle = (callback = () => {}) => {
    if (!isGoogleLogin) callback();
    else {
      dispatch(isUserGoogleLogin(false));
      logOutGoogle().then((res) => {
        if (res.status === 200) {
          setOpenGoogleModal(false);
          callback();
        }
      });
    }
  };

  if (loading) return ( <div className={styles.profileComponent} style={{ justifyContent: "center" }}><CircularProgress/></div> );
  if (!data) return (<div className={styles.profileComponent} style={{ justifyContent: "center" }}><SadFace className={styles.notFoundError}/><b style={{ color: "grey" }}>No Data Found</b></div>);


  /* VIEW MODE */
  if (!edit)
    return (
      <div className={styles.profileComponent}>
        <Paper className={styles.card} elevation={6}>
          <div className={styles.infoWrapper}>
            <Avatar className={styles.avatar} alt={data.fullName.toUpperCase()} src={data.avatar ?? "/broken"}/>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px"}}>
              
              { /* Basic info*/ }
              <span style={{ display: "inline-flex", alignItems: "flex-end", gap: "15px" }}>
                <Typography sx={{ textTransform: "capitalize", fontWeight: "600" }} variant="h3">{data.fullName}</Typography>
                <Typography sx={{ textDecoration: "underline", color: "gray" }} variant="h6" >@{data.username}</Typography>
              </span>
              <Typography className={styles.userInfo}>Email: <i>{data.email}</i></Typography>
              {data.cellPhone && username === tokenUsername ? (<Typography className={styles.userInfo}>Phone: <i>{data.cellPhone}</i></Typography>) : null}
              {data.birthDate && username === tokenUsername ? (<Typography className={styles.userInfo}>Birth Date: <i>{data.birthDate}</i></Typography>) : null}
              
              {/* Payment */}
              <span style={{ display: "flex", flexDirection: "column", gap: "10px", }}>
                <Button className={styles.userPlan} variant="outlined" size="medium" disabled >{data.plan}Plan</Button>
                {data.plan !== "premium" && username === tokenUsername ? 
                  <Plans popover payment
                    popoverProps={{ buttonText: "Want more? Go premium!" }}
                    paymentProps={{
                      currentPlan: data.plan,
                      onSuccess: (newPlan) => {
                        upgradePlan(username, newPlan, data).then(() => {
                          dispatch(setToken({...decodedToken, plan: newPlan}));
                          fetchData( `/api/v1/accounts/${username}`, setData, setLoading)
                        })
                      },
                      onError: (err) => {
                        alert("Error in the transaction.");
                        console.log(err);
                      }
                    }}
                  /> : null}
              </span>

              { /* Google modal */}
              {isGoogleLogin && data.plan !== "base" ? <Button className={styles.signoutGoogleButton} variant="contained" onClick={() => { setOpenGoogleModal(true); }}> Google log out <GoogleIcon className={styles.googleIcon} /></Button> : null}
              <Modal open={openGoogleModal} onClose={() => {setOpenGoogleModal(false);}}>
                <Box bgcolor={"white"} className={styles.modal}>
                  <div>
                    <div className={styles.modalHeader}>
                      <div style={{ width: "100%" }}>
                        <img src="/small-logo.png" alt="logo" className={styles.logo} />
                        <h3 style={{ color: "black" }}> Are you sure you want to log out from Google? </h3>
                        <p style={{ color: "black" }}> You will not be able to syncronize your events with Google Calendar </p>
                      </div>
                    </div>
                    <Button className={styles.confirmButton} onClick={() => logoutGoogle()}> <LogoutIcon className={styles.buttonIcon} />Log out</Button>
                    <Button className={styles.cancelButton} onClick={() => setOpenGoogleModal(false)}><CancelIcon className={styles.buttonIcon} />Cancel</Button>
                  </div>
                </Box>
              </Modal>
            </div>
          </div>
          {/* Edit and delete buttons */}
          {username === tokenUsername ? 
            <span className={styles.EditDeleteButtons} style={{position: "absolute", right: "15px", top: "15px", display: "inline-flex"}}>
              <IconButton onClick={() => { confirm("Are you sure you want to delete the account?") ? logoutGoogle(() => deleteAccount(username)) : null; }} aria-label="delete" size="large"><DeleteIcon fontSize="inherit" color="error"/></IconButton>
              <IconButton onClick={() => setEdit(true)} aria-label="modify" size="large" ><EditIcon fontSize="inherit" /></IconButton>
            </span>
            : null}
        </Paper>
        
        { /* User recipes */}
        { recipes?.length > 0 ?
          <div className={styles.recipeContainer} style={{ display: "flex", flexWrap: "wrap", width: "100%", marginTop: "20px", gap: "20px", justifyContent: recipes.length > 2 ? "space-evenly" : "flex-start" }}>
            <Typography variant="h4" style={{ width: "100%", fontWeight: 600, color: "gray", margin: "10px 0px", textAlign: "center" }}>My Recipes<Divider style={{marginTop: "5px"}}/></Typography>
            {recipes.map((item, index) => (
              <span style={{position: "relative"}}>
              <Link key={index} href={`/recipes/${item._id}`}>
                <RecipeCard img={item.imageUrl} name={item.name} summary={item.summary} style={{margin: "0px"}}></RecipeCard>
              </Link>
              <IconButton style={{position: "absolute", top: "-10px", right: "-10px", backgroundColor: "#772318"}}>
                <DeleteIcon fontSize="inherit" style={{color: "white"}} onClick={() => { confirm("Are you sure you want to delete the recipe?") ? deleteRecipe(item._id).then(() => setRecipes((prev) => prev.filter(r => r._id !== item._id))).catch(() => alert("Recipe could not be deleted. Try again later")) : null; }}/>
              </IconButton>
              </span>
            ))}
          </div>
          : null
        }
      </div>
    );
  /* EDIT MODE */ 
  else
    return (
      <div className={styles.profileComponent}>
        <Paper className={styles.card} elevation={6}>
          <div className={styles.basicInfoForm}>
            <UploadImage data={data} setData={setData} d={150} />
            <span
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "30px",
                width: "100%",
              }}
            >
              <TextField
                value={data.fullName}
                onChange={(ev) =>
                  validateField(setData, setError, ev.target.value, "fullName")
                }
                error={error.fullName.length > 0 ? true : false}
                helperText={error.fullName}
                className={styles.formInput}
                size="small"
                label="Name"
                variant="outlined"
              />
              <TextField
                value={data.password}
                onChange={(ev) =>
                  validateField(setData, setError, ev.target.value, "password")
                }
                error={error.password.length > 0 ? true : false}
                helperText={error.password}
                className={styles.formInput}
                size="small"
                label="Password"
                variant="outlined"
                type="password"
                InputLabelProps={{ shrink: true }}
                placeholder={"New Password"}
              />
            </span>
          </div>
          <TextField
            value={data.email}
            onChange={(ev) =>
              validateField(setData, setError, ev.target.value, "email")
            }
            error={error.email.length > 0 ? true : false}
            helperText={error.email}
            className={styles.formInput}
            size="small"
            label="Email"
            variant="outlined"
            type={"email"}
          />
          <TextField
            value={data.birthDate}
            onChange={(ev) =>
              validateField(setData, setError, ev.target.value, "birthDate")
            }
            error={error.birthDate.length > 0 ? true : false}
            helperText={error.birthDate}
            className={styles.formInput}
            size="small"
            label="Birth Date"
            variant="outlined"
            type={"date"}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            value={data.cellPhone}
            onChange={(ev) =>
              validateField(setData, setError, ev.target.value, "cellPhone")
            }
            error={error.cellPhone.length > 0 ? true : false}
            helperText={error.cellPhone}
            className={styles.formInput}
            size="small"
            label="Cell Phone"
            variant="outlined"
            type={"tel"}
            InputLabelProps={{ shrink: true }}
            placeholder={"123 456 789"}
          />

          <span
            style={{
              display: "flex",
              flexDirection: "row",
              width: "100%",
              justifyContent: "flex-end",
            }}
          >
            <Button
              onClick={() => {
                setLoadingButton(true);
                modify(username, data, setError, setEdit).finally(() =>
                  setLoadingButton(false)
                );
              }}
              className={styles.saveButton}
              variant="contained"
              size="large"
              disabled={loadingButton}
            >
              {loadingButton ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Save"
              )}
            </Button>
          </span>

          <IconButton
            onClick={() => setEdit(false)}
            sx={{ position: "absolute", right: "15px", top: "15px" }}
            aria-label="delete"
            size="large"
          >
            <EditOffIcon fontSize="inherit" />
          </IconButton>
        </Paper>
      </div>
    );
}
