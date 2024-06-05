import service from "./request";

getComment = (data) => {
  return service.post("https://api.chatanywhere.tech/v1/chat/completions", data );
}

export default {
  getComment
}
