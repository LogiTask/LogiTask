import api from '../api';

const Dev: React.FC = () => {

    //  const generateJobs = async () => {
    //   await api.get("/api/generateJobs/", {});
    // };
    
    const schedule_id = 1
    const title = "FIRST NOTE3"
    const content = "DO NOT MOW2"
    const createNote = async () => {
      await api.post(`/api/schedule/${schedule_id}/notes/`,  { title: title,content:content});
    };
    const noteID= 1
    const getNote = async () => {
      await api.get(`/api/schedule-note/${noteID}/`);
    }
    const updateNote = async () => {
      await api.patch(`/api/schedule-note/modify/${noteID}/`, {content:content });
    }
     const deleteNote = async () => {
      await api.delete(`/api/schedule-note/modify/${noteID}/`);
    }
    
  return(
  <>
    
    <button onClick={createNote}>SEND NOTE</button>
    <div>UPDATE NOTE</div>
    <button onClick={getNote}>GET NOTE</button>
    <div>UPDATE Note</div>
    <button onClick={updateNote}>UPDATE NOTE</button>
    <div>DELETE Note</div>
    <button onClick={deleteNote}>DELETE NOTE</button>
    
    
    
  </>
  )
  
};

export default Dev;