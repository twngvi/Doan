function TEST_adminSaveQuestions() {
  const q = {
    questionId: "MCQ-123",
    status: "approved",
    createdAt: "2024-05-30T10:00:00.000Z"
  };
  return adminSaveQuestions("TOP001", [q]);
}
