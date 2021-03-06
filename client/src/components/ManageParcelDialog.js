import React, { useState, useContext, createRef } from 'react';
import ReactDOM from 'react-dom';
import { makeStyles, withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import TextField from '@material-ui/core/TextField';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import CloseIcon from '@material-ui/icons/Close';
import Grid from '@material-ui/core/Grid';
import Switch from '@material-ui/core/Switch';
import Slide from '@material-ui/core/Slide';
import Paper from '@material-ui/core/Paper';

import web3 from 'web3';

import DelaContext from '../context/dela-context';
import AppSnackbar from './AppSnackbar';
import ParcelLandUseCodeAutoList from './ParcelLandUseCodeAutoList';


const CadastralTypeCode = {PARCEL : 0, BUILDING : 1};

const useStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1,
    height: 250,
  },
  appBar: {
    position: 'relative',
  },
  title: {
    marginLeft: theme.spacing(2),
    flex: 1,
  },
  paper: {
    padding: theme.spacing(2),
    color: theme.palette.text.secondary,
    backgroundColor: theme.palette.background.default,
  },
}));

const AntSwitch = withStyles(theme => ({
  root: {
    width: 28,
    height: 16,
    padding: 0,
    display: 'flex',
  },
  
  switchBase: {
      padding: 2,
      color: theme.palette.grey[500],
      '&$checked': {
        transform: 'translateX(12px)',
        color: theme.palette.common.white,
      '& + $track': {
        opacity: 1,
        backgroundColor: theme.palette.primary.secondary,
        borderColor: theme.palette.primary.secondary,
      },
    },
  },
  thumb: {
    width: 12,
    height: 12,
    boxShadow: 'none',
  },
  track: {
    border: `1px solid ${theme.palette.grey[500]}`,
    borderRadius: 16 / 2,
    opacity: 1,
    backgroundColor: theme.palette.common.white,
  },
  checked: {},
}))(Switch);

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function ManageParcelDialog(props) {

  const classes = useStyles();

  /**
   * @dev state variables
   */
  const [parcelLabel, setParcelLabel] = useState("");
  const [parcelAddress, setParcelAddress] = useState("");
  const [parcelArea, setParcelArea] = useState("");
  const [parcelLandUseCode, setParcelLandUseCode] = useState("");
  const [cadastralType, setCadastralType] = React.useState(false);

  const [formValid, setFormValid] = useState(true)

  const [transactionHash, setTransactionHash] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);


  const context = useContext(DelaContext);

  const labelRef = createRef();
  const addressRef = createRef();
  const areaRef = createRef();  

  /**
   * @dev Claim Parcel onClick event handler
   */

  const handleClaimParcel = async () => {
    if (parcelArea === "" || parcelArea < 0 || parcelLabel === "" || parcelLandUseCode === "" || parcelAddress === "") {
      setFormValid(false);
    }
    else {
      const lat = props.latlng.lat;
      const lng = props.latlng.lng;

      const parcelCadastralType = cadastralType ? CadastralTypeCode.BUILDING : CadastralTypeCode.PARCEL;
      
      const wkbHash = web3.utils.soliditySha3(props.geometryWKB);

      const result = await context.claimParcel(lat, lng, wkbHash, parcelArea, 
                                            parcelAddress, parcelLabel, parcelLandUseCode.value,
                                            parcelCadastralType);

      // write WKB of the parcel to the OrbitDB/IPFS
      context.parcelKVDB.put(wkbHash, props.geometryWKB);
      context.setParcelGeoms(geoms => {
        const geom = {'wkbHash': wkbHash, 'geom': props.geometryWKB }
        const list = [...geoms, geom];
        return list;
    });

      setTransactionHash(result);
      setSnackbarOpen(true);
      context.closeManageParcelDialog();
    }
  }

   /**
   * @dev Update Parcel onClick event handler
   */

  const handleUpdateParcel = async () => {
    const label = ReactDOM.findDOMNode(labelRef.current).querySelector('input').value;
    const address = ReactDOM.findDOMNode(addressRef.current).querySelector('input').value;
    const area = ReactDOM.findDOMNode(areaRef.current).querySelector('input').value;
    const _type = typeof(parcelLandUseCode.value) === 'undefined' ? context.parcelToUpdate.parcelLandUseCode : parcelLandUseCode.value;
    
    if (area.value === "" || area.value < 0 || label.value === "" || address.value === "" || _type === "") {
      setFormValid(false);
    }
    else {
      const parcelCadastralType = cadastralType ? CadastralTypeCode.BUILDING : CadastralTypeCode.PARCEL;

      const result = await context.updateParcel(area, address, label, _type, parcelCadastralType);

      setTransactionHash(result);
      setSnackbarOpen(true);
      context.closeManageParcelDialog();
    }
  }

  /**
   * 
   */
  const handleCadastralTypeChange = event => {
    // console.log(event.target.checked);
    setCadastralType(cadastralType => !cadastralType);
  }

  /**
   * @dev rendering
   */

  return (
    <div className={classes.root}>
      <Dialog
        fullScreen
        TransitionComponent={Transition}
        PaperProps={{ style: { overflowY: 'visible' } }}
        open={context.manageParcelDialogOpen}
        onClose={context.closeManageParcelDialog}
        aria-labelledby="draggable-dialog-title"
      >
        <AppBar className={classes.appBar}>
          <Toolbar>
            <IconButton edge="start" color="inherit" aria-label="close" onClick={context.closeManageParcelDialog}>
              <CloseIcon />
            </IconButton>
            <Typography variant="h6" className={classes.title}>
              {context.updateMode ? <span> Update parcel </span> : <span> Claim parcel</span>}
            </Typography>
            {context.updateMode ?
              <Button autoFocus onClick={handleUpdateParcel} variant="contained" color="secondary">
                Update
              </Button>
              :
              <Button autoFocus onClick={handleClaimParcel} variant="contained" color="secondary">
                Claim
              </Button>
            }
          </Toolbar>
        </AppBar>

        <DialogContent style={{ overflowY: 'visible' }}>
          <DialogContentText>
            To {context.updateMode ? <span> update </span> : <span> claim</span>} this parcel, please fill-in the following informations.
          </DialogContentText>

          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Paper style={{ padding: '1rem' }} className={classes.paper}>
                <Typography component="div">
                  <Grid component="label" container alignItems="center" spacing={1}>
                    <Grid item>Parcel</Grid>
                    <Grid item>
                      <AntSwitch
                        checked={cadastralType}
                        onChange={handleCadastralTypeChange}
                      />
                    </Grid>
                    <Grid item>Building</Grid>
                  </Grid>
                </Typography>

                <TextField
                  autoFocus
                  error={parcelLabel === "" && !formValid}
                  margin="dense"
                  id="parcel-label"
                  label="Label"
                  fullWidth
                  ref={labelRef}
                  defaultValue={context.updateMode ? context.parcelToUpdate.lbl : ""}
                  onChange={(evt) => setParcelLabel(evt.target.value)}
                />
                <ParcelLandUseCodeAutoList setParcelLandUseCode={setParcelLandUseCode}
                  parcelLandUseCode={context.updateMode ? context.parcelToUpdate.parcelLandUseCode : ""} />
                <TextField
                  autoFocus
                  error={parcelAddress === "" && !formValid}
                  margin="dense"
                  id="parcel-address"
                  label="External Address"
                  fullWidth
                  ref={addressRef}
                  defaultValue={context.updateMode ? context.parcelToUpdate.addr : ""}
                  onChange={(evt) => setParcelAddress(evt.target.value)}
                />
                <TextField
                  autoFocus
                  error={(parcelArea === "" && !formValid) || Number(parcelArea) < 0}
                  margin="dense"
                  id="parcel-area"
                  type="number"
                  label="Area"
                  fullWidth
                  ref={areaRef}
                  defaultValue={context.updateMode ? context.parcelToUpdate.area : ""}
                  onChange={(evt) => setParcelArea(evt.target.value)}
                />
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
      </Dialog>
      <AppSnackbar snackbarOpen={snackbarOpen} transactionHash={transactionHash} />
    </div>
  )
};
