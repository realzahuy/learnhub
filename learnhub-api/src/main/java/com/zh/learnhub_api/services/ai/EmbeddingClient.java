package com.zh.learnhub_api.services.ai;

import java.util.List;

public interface EmbeddingClient {

    List<Float> embedDocument(String text, String title);

    List<List<Float>> embedQueries(List<String> texts);
}
