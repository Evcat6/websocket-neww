import { showMessageModal } from "../views/modal.mjs";

const clientErrorHandler = (error) => {
  return showMessageModal({ message: error });
};

export { clientErrorHandler };
