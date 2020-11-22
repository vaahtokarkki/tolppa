import React, { useState, useEffect } from 'react'
import Typography from '@material-ui/core/Typography'
import Card from '@material-ui/core/Card'
import CardContent from '@material-ui/core/CardContent'
import Grid from '@material-ui/core/Grid'
import Slider from '@material-ui/core/Slider'
import Button from '@material-ui/core/Button'
import TextareaAutosize from '@material-ui/core/TextareaAutosize'
import Fab from '@material-ui/core/Fab'
import AccessAlarms from '@material-ui/icons/AccessAlarms'
import SpeedIcon from '@material-ui/icons/Speed'
import CircularProgress from '@material-ui/core/CircularProgress'
import axios from 'axios'
import {
  MuiPickersUtilsProvider,
  KeyboardTimePicker,
  KeyboardDatePicker,
} from '@material-ui/pickers'
import DateFnsUtils from '@date-io/date-fns'
import Alert from '@material-ui/lab/Alert'
import InputLabel from '@material-ui/core/InputLabel'
import moment from 'moment'

import './tolppa.css'

axios.defaults.withCredentials = true

const api = axios.create()
const URL =
  !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
    ? 'http://localhost:1337'
    : 'https://tolppa-gateway-nas5m5k7jq-lz.a.run.app'

const App = (props) => {
  const [duration, setDuration] = useState(60)
  const [details, setDetails] = useState(null)
  const [message, setMessage] = useState(null)
  const [token, setToken] = useState(
    window.localStorage.getItem('token') || '',
  )
  const [endDate, setEndDate] = useState(new Date())
  const [endTime, setEndTime] = useState(new Date())
  const [addQuick, setAddQuick] = useState(true)

  const fetchDetails = async () => {
    try {
      const resp = await api.post(`${URL}/details`, { token })
      const {
        reservations,
        state,
        licensePlate,
        temperature,
        consumption,
      } = resp.data
      setDetails({
        reservations,
        state,
        licensePlate,
        temperature,
        consumption,
      })
    } catch (e) {
      setMessage({
        variant: 'error',
        message: e.toString().includes('400')
          ? 'You need to set token!'
          : 'Unknown error!',
      })
      console.log(e)
    }
  }

  useEffect(() => {
    fetchDetails()
    const interval = setInterval(fetchDetails, 5000)
    return () => clearTimeout(interval);
  }, [])

  const onTokenChange = (event) => {
    const newToken = event.target.value
    window.localStorage.setItem('token', newToken)
    setToken(newToken)
  }

  const submit = async () => {
    const data = {
      ...getEndTimeAndDate(),
      duration,
      eco: false,
      token,
    }
    try {
      await api.post(`${URL}/timer`, data)
      setMessage({
        variant: 'success',
        message: 'Timer sent to gateway successfully!',
      })
      setDetails(null)
      fetchDetails()
    } catch (e) {
      setMessage({ variant: 'error', message: e.toString() })
    }
  }

  const getEndTimeAndDate = () => {
    if (addQuick)
      return {
        endDate: moment().format('DD.MM.YYYY'),
        endTime: moment().add(duration, 'minutes').format('HH:mm'),
      }
    const endDateMoment = moment(endDate)
    const endTimeMoment = moment(endTime)
    return {
      endDate: endDateMoment.format('DD.MM.YYYY'),
      endTime: endTimeMoment.format('HH:mm'),
    }
  }

  const renderMessage = () =>
    message ? (
      <Alert severity={message.variant}>{message.message}</Alert>
    ) : null

  const renderDetails = () => {
    if (!details)
      return (
        <Grid item xs={12} className="row">
          <Card>
            <CardContent>
              <CircularProgress />
            </CardContent>
          </Card>
        </Grid>
      )

    const activeTimer = findActiveTimer(details.reservations || [])
    const heatedTime = activeTimer
      ? moment().diff(
          moment(
            `${activeTimer.dateStart} ${activeTimer.timeStart}`,
            'DD.MM.YYYY HH:mm',
          ),
          'minutes',
        )
      : 0

    return (
      <Grid item xs={12} className="row">
        <Card>
          <CardContent
            className={
              details && details.state ? 'status-on' : 'status-off'
            }
          >
            {details && details.state ? (
              <>
                <Typography variant="h6">
                  Your tolppa is on!
                </Typography>
                <Typography variant="body1">
                  Car heated for {heatedTime}min!{' '}
                  {`${details.consumption}W`}
                </Typography>
              </>
            ) : (
              <Typography variant="h6">
                Your tolppa is off!
              </Typography>
            )}
          </CardContent>
          <CardContent>
            <Typography variant="subtitle1">
              {details.licensePlate}
            </Typography>
            <Typography variant="body1">
              {details.temperature}°C, {details.reservations.length}/2
              timers
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    )
  }

  const renderForm = () =>
    addQuick ? (
      <>
        <Grid item xs={12}>
          <InputLabel htmlFor="dur">
            {formatMinutes(duration)}
          </InputLabel>
          <Slider
            label="Duration"
            value={duration}
            min={15}
            max={200}
            onChange={(e, value) => setDuration(value)}
            aria-labelledby="continuous-slider"
          />
        </Grid>
      </>
    ) : (
      <>
        <Grid item xs={12}>
          <InputLabel htmlFor="dur">
            {formatMinutes(duration)}
          </InputLabel>
          <Slider
            label="Duration"
            value={duration}
            min={15}
            max={200}
            onChange={(e, value) => setDuration(value)}
            aria-labelledby="continuous-slider"
          />
        </Grid>
        <Grid item xs={12} className="form-row">
          <KeyboardDatePicker
            disableToolbar
            variant="inline"
            format="dd.MM.yyyy"
            margin="normal"
            id="date-picker-inline"
            label="Date for new time"
            value={endDate}
            onChange={setEndDate}
            KeyboardButtonProps={{
              'aria-label': 'change date',
            }}
          />
        </Grid>
        <Grid item xs={12} className="form-row">
          <KeyboardTimePicker
            ampm={false}
            margin="normal"
            id="time-picker"
            label="When the car should be ready"
            value={endTime}
            onChange={setEndTime}
            KeyboardButtonProps={{
              'aria-label': 'change time',
            }}
          />
        </Grid>
      </>
    )

  return (
    <div className="container">
      <Grid>
        {renderMessage()}
        {renderDetails()}

        <MuiPickersUtilsProvider utils={DateFnsUtils}>
          <Grid item xs={12} className="row">
            <Card>
              <CardContent>
                <Grid>
                  <Grid item xs={12} className="center">
                    <Fab
                      variant="extended"
                      color="primary"
                      onClick={() => setAddQuick(!addQuick)}
                    >
                      {addQuick ? (
                        <>
                          <AccessAlarms /> Schedule car heating
                        </>
                      ) : (
                        <>
                          <SpeedIcon /> Add quick timer
                        </>
                      )}
                    </Fab>
                  </Grid>
                  {renderForm()}

                  <Grid
                    item
                    xs={12}
                    style={{
                      textAlign: 'center',
                      paddingTop: '1rem',
                    }}
                  >
                    <Button
                      variant="contained"
                      disabled={!token}
                      color="primary"
                      onClick={submit}
                    >
                      Heat the car
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} className="row pad">
            <Card style={{ padding: '.7rem .5rem' }}>
              <InputLabel>Add cookies for sign in</InputLabel>
              <TextareaAutosize
                value={token}
                onChange={onTokenChange}
                rowsMin={10}
                rowsMax={10}
              />
            </Card>
          </Grid>
        </MuiPickersUtilsProvider>
        <Card style={{ textAlign: 'center' }}>
          <CardContent>
            <Button
              size="large"
              color="primary"
              variant="outlined"
              onClick={() =>
                window.open('https://eparking.fi/fi/u#/reservations')
              }
            >
              Manage reservations!
            </Button>
          </CardContent>
        </Card>
      </Grid>
    </div>
  )
}

function formatMinutes(minutes) {
  if (minutes < 60) return `${minutes}min`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}min`
}

function findActiveTimer(timers) {
  const dateFormat = 'DD.MM.YYYY HH:mm'
  const now = moment()
  return timers.find(({ dateStart, dateEnd, timeStart, timeEnd }) => {
    const start = moment(`${dateStart} ${timeStart}`, dateFormat)
    const end = moment(`${dateEnd} ${timeEnd}`, dateFormat)
    return start.isBefore(now) && end.isAfter(now)
  })
}

export default App
