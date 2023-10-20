import { useReducer, useRef } from "react";

function Old() {
  const placeHolder = [
    {
      id: 1,
      title: "Todo",
      content: "Enter todo"
    },
    {
      id: 2,
      title: "Name",
      content: "Enter name"
    }
  ]
  //useReducer
  // 1. Init state

  const initState = {
    job: '',
    jobs: []
  }

  const inputRef = useRef();

  // 2. Actions

  const SET_JOB = 'set_job'
  const ADD_JOB = 'add_job'
  const DELETE_JOB = 'delete_job'

  const setJob = payload => {
    return {
      type: SET_JOB,
      payload
    }
  }
  const addJob = payload => {
    return {
      type: ADD_JOB,
      payload
    }
  }

  const deleteJob = payload => {
    return {
      type: DELETE_JOB,
      payload
    }
  }
  // 3. Reducer

  const reducer = (state, action) => {
    console.log('Action: ', action)
    console.log('Pre state: ', state);

    let newState

    switch (action.type) {
      case SET_JOB:
        return {
          ...state,
          job: action.payload
        }
      case ADD_JOB:
        return {
          ...state,
          jobs: [...state.jobs, action.payload]
        }
      case DELETE_JOB:
        const newJobs = [...state.jobs]
        newJobs.splice(action.payload, 1)
        newState = {
          ...state,
          jobs: newJobs
        }
        break
      default:
        throw new Error('Invalid action.')
    }

    console.log('New State: ', newState);
    return newState
  }
  // 4. Dispatch

  const [state, dispatch] = useReducer(reducer, initState)
  const { job, jobs } = state

  const handleAddJob = () => {
    dispatch(addJob(job))
    dispatch(setJob(''))

    inputRef.current.focus();
  }


  return (
    <div style={{ padding: 20 }}>
      <h3>Todo</h3>
      <input
        value={job}
        ref={inputRef}
        placeholder={placeHolder[0].content}
        onChange={e => {
          dispatch(setJob(e.target.value))
        }}
        type="text" />
      <button
        onClick={handleAddJob}
      >
        Add
      </button>

      <ul>
        {
          jobs.map((job, index) => (
            <li
              key={index}
            >
              {job} 
              <span onClick={() => dispatch(deleteJob(index))}>
                &times;
              </span>
            </li>
          ))
        }

      </ul>

    </div>
  );
}

export default Old;
