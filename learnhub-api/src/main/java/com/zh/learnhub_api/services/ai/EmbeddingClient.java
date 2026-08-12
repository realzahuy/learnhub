package com.zh.learnhub_api.services.ai;

import java.util.List;

public interface EmbeddingClient {

    List<Float> embedDocument(String text, String title);

    List<Float> embedQuery(String text);
}
